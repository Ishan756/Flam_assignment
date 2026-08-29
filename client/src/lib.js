/** Defensive client-side shape check before rendering. */
export function sanitizeDeck(input) {
  let deck = input;
  if (typeof deck === 'string') {
    try {
      deck = JSON.parse(deck);
    } catch {
      return { ok: false, errors: ['Could not parse the server result.'] };
    }
  }
  if (!deck || typeof deck !== 'object') {
    return { ok: false, errors: ['The server returned an unexpected format.'] };
  }
  const errors = [];
  const flashcards = [];
  if (!Array.isArray(deck.flashcards)) {
    errors.push('No flashcards were returned.');
  } else {
    for (const f of deck.flashcards) {
      if (f && typeof f.front === 'string' && typeof f.back === 'string' && f.front.trim() && f.back.trim()) {
        flashcards.push({ front: f.front.trim(), back: f.back.trim() });
      }
    }
  }
  const quiz = [];
  if (!Array.isArray(deck.quiz)) {
    if (!errors.length || deck.quiz) errors.push('No quiz was returned.');
  } else {
    for (const q of deck.quiz) {
      if (
        q &&
        typeof q.question === 'string' &&
        Array.isArray(q.options) &&
        q.options.length >= 2 &&
        q.options.every((o) => typeof o === 'string') &&
        Number.isInteger(q.answerIndex) &&
        q.answerIndex >= 0 &&
        q.answerIndex < q.options.length
      ) {
        quiz.push({
          question: q.question.trim(),
          options: q.options.map((o) => String(o).trim()),
          answerIndex: q.answerIndex,
          explanation: typeof q.explanation === 'string' ? q.explanation.trim() : '',
        });
      }
    }
  }
  if (!flashcards.length && !quiz.length) {
    return { ok: false, errors: ['No usable content was returned. Please try again.'] };
  }
  return { ok: true, deck: { flashcards, quiz }, errors };
}

export function summarize(text, n = 60) {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > n ? clean.slice(0, n - 1) + '…' : clean;
}
