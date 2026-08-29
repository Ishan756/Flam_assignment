export function validateDeck(deck) {
  const errors = [];
  if (!deck || typeof deck !== 'object') {
    return { ok: false, errors: ['No JSON object was returned.'] };
  }

  if (!Array.isArray(deck.flashcards)) {
    errors.push('Missing "flashcards" array.');
  } else {
    const cleaned = [];
    for (const [i, f] of deck.flashcards.entries()) {
      if (f && typeof f === 'object' && typeof f.front === 'string' && typeof f.back === 'string') {
        const front = f.front.trim();
        const back = f.back.trim();
        if (!front || !back) {
          errors.push(`Flashcard ${i + 1} is missing text and was dropped.`);
          continue;
        }
        cleaned.push({ front, back });
      } else {
        errors.push(`Flashcard ${i + 1} was malformed and dropped.`);
      }
    }
    deck.flashcards = cleaned;
  }

  if (!Array.isArray(deck.quiz)) {
    errors.push('Missing "quiz" array.');
  } else {
    const cleaned = [];
    for (const [i, q] of deck.quiz.entries()) {
      if (
        q &&
        typeof q === 'object' &&
        typeof q.question === 'string' &&
        Array.isArray(q.options) &&
        q.options.length >= 2 &&
        q.options.every((o) => typeof o === 'string')
      ) {
        const question = q.question.trim();
        const options = q.options.map((o) => String(o).trim()).filter(Boolean);
        let answerIndex = Number(q.answerIndex);
        if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= options.length) {
          errors.push(`Quiz question ${i + 1} had an invalid answerIndex and was dropped.`);
          continue;
        }
        if (!question) {
          errors.push(`Quiz question ${i + 1} had no text and was dropped.`);
          continue;
        }
        cleaned.push({
          question,
          options,
          answerIndex,
          explanation: typeof q.explanation === 'string' ? q.explanation.trim() : '',
        });
      } else {
        errors.push(`Quiz question ${i + 1} was malformed and dropped.`);
      }
    }
    deck.quiz = cleaned;
  }

  if (!deck.flashcards.length && !deck.quiz.length) {
    return { ok: false, errors: ['No usable flashcards or quiz questions were returned.'] };
  }

  return { ok: errors.length === 0, deck, errors };
}

/**
 * Pull a JSON object out of raw model text. The model is instructed to return only JSON,
 * but may wrap it in code fences or add stray text — extract and repair best-effort.
 */
export function extractJson(raw) {
  if (typeof raw !== 'string') return null;
  let text = raw.trim();

  // Strip outer code fences (```json ... ``` or plain ``` ... ```)
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```\s*$/i);
  if (fence) text = fence[1].trim();

  // Find first { ... last } as the candidate JSON object.
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  const candidate = text.slice(start, end + 1);

  try {
    return JSON.parse(candidate);
  } catch {
    // Common failure: trailing commas. Try a light repair.
    try {
      return JSON.parse(candidate.replace(/,\s*([}\]])/g, '$1'));
    } catch {
      return null;
    }
  }
}
