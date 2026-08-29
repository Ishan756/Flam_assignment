/**
 * Talks to the backend /api/study endpoint.
 * The backend streams newline-delimited JSON: {delta}/{final}/{finalError}/{error}.
 * We surface partial text progressively and resolve with the final validated deck.
 */
export async function streamStudy({ text, existing, onDelta, signal }) {
  const res = await fetch('/api/study', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, existing: existing || null }),
    signal,
  });

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  if (!res.body) throw new Error('No response stream.');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';
  let result;
  let error;
  let demo = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;

      let obj;
      try {
        obj = JSON.parse(line);
      } catch {
        continue;
      }

      if (obj.delta) {
        accumulated += obj.delta;
        onDelta?.(accumulated);
      } else if (obj.demo) {
        result = obj.deck;
        demo = true;
        onDelta?.('');
      } else if (obj.final) {
        result = obj.final;
      } else if (obj.finalError) {
        error = new Error(
          Array.isArray(obj.finalError) ? obj.finalError.join(' ') : 'The model returned invalid data.',
        );
      } else if (obj.error) {
        error = new Error(obj.error);
      }
    }
  }

  if (error) throw error;
  if (!result) throw new Error('The request ended without a result. Please try again.');
  return { deck: result, demo };
}
