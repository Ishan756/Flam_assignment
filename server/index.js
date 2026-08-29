import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getConfig, isConfigured } from './config.js';
import { buildRequest } from './prompt.js';
import { validateDeck, extractJson } from './deck.js';
import { demoDeck } from './demo.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 4000;

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, configured: isConfigured(), model: getConfig().model || null });
});

/**
 * POST /api/study
 * Body: { text: string, existing?: object|null }
 * Streams the provider's chunks back, then a final line containing the validated JSON
 * (or { _error } if validation failed).
 */
app.post('/api/study', async (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  const existing = req.body?.existing || null;

  if (!text) {
    return res.status(400).json({ error: 'Provide some study material or a topic.' });
  }

  if (!isConfigured()) {
    // No provider configured -> demo fallback so the UI is testable without a key.
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.write(JSON.stringify({ demo: true, deck: demoDeck() }) + '\n');
    return res.end();
  }

  const cfg = getConfig();
  let upstream;

  try {
    upstream = await fetch(`${cfg.baseURL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
      body: JSON.stringify(buildRequest({ text, existing })),
    });
  } catch (err) {
    return res.status(502).json({ error: `Could not reach the AI provider: ${err.message}` });
  }

  if (!upstream.ok) {
    let detail = '';
    try {
      const body = await upstream.json();
      detail = body?.error?.message || JSON.stringify(body);
    } catch {
      detail = await upstream.text().catch(() => '');
    }
    return res.status(upstream.status).json({
      error: `AI provider error (${upstream.status}): ${detail || upstream.statusText}`,
    });
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');

  if (!upstream.body) {
    return res.status(502).json({ error: 'The provider returned no stream.' });
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let raw = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') continue;

        let json;
        try {
          json = JSON.parse(payload);
        } catch {
          continue;
        }

        const delta = json?.choices?.[0]?.delta?.content;
        if (delta) {
          raw += delta;
          // Forward a chunk line to the client.
          res.write(JSON.stringify({ delta }) + '\n');
        }
      }
    }
  } catch (err) {
    return res.write(JSON.stringify({ error: `Stream interrupted: ${err.message}` }) + '\n');
  }

  // Finalize: validate the accumulated text.
  const parsed = extractJson(raw);
  const result = validateDeck(parsed);
  if (result.ok) {
    res.write(JSON.stringify({ final: result.deck }) + '\n');
  } else {
    res.write(JSON.stringify({ finalError: result.errors }) + '\n');
  }
  res.end();
});

app.listen(PORT, () => {
  console.log(`Study Assistant backend listening on http://localhost:${PORT}`);
  console.log(
    isConfigured()
      ? `Provider configured (model: ${getConfig().model})`
      : 'No AI provider configured — demo fallback is active. See server/.env.example.',
  );
});
