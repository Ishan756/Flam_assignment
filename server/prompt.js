import { getConfig } from './config.js';

export function systemPrompt() {
  return [
    'You are a helpful study assistant that converts study material into a structured,',
    'interactive study deck. Your entire output must be ONE valid JSON object and nothing else.',
    'Do NOT wrap it in markdown code fences, do NOT add commentary before or after.',
    '',
    'The JSON must conform EXACTLY to this shape:',
    '{',
    '  "flashcards": [',
    '    { "front": "short prompt or question", "back": "concise answer/explanation" }',
    '  ],',
    '  "quiz": [',
    '    {',
    '      "question": "the question text",',
    '      "options": ["a", "b", "c", "d"],',
    '      "answerIndex": 0,',
    '      "explanation": "short explanation of the correct answer"',
    '    }',
    '  ]',
    '}',
    '',
    'Rules:',
    '- "flashcards": 5 to 10 cards covering the key concepts.',
    '- "quiz": 5 to 8 multiple-choice questions. Each must have between 2 and 6 options and',
    '  a valid "answerIndex" pointing at the correct option.',
    '- answerIndex must be a number (0-based) within the range of options.',
    '- Keep text clear and concise. Escape any double quotes inside strings.',
  ].join('\n');
}

export function userPrompt({ text, existing }) {
  const lines = ['Study material or topic to turn into a deck:', '', text.trim(), ''];

  if (existing) {
    lines.push(
      'The user already has this deck and is asking for a refinement. Produce a NEW deck that',
      'keeps and improves on the existing content while applying the user\'s new instruction.',
    );
    lines.push('Existing deck:');
    lines.push(JSON.stringify(existing));
    lines.push('');
    lines.push('User\'s new instruction: ' + text.trim());
    lines.push(
      'Merge the requested changes in. Do not drop the prior material unless the instruction says so.',
    );
    lines.push(
      'Watch for implied card/quiz indices when the user references existing items (e.g. "question 5");',
      'treat them as 1-based indexes into the existing deck.',
    );
  }

  return lines.join('\n');
}

const MODEL_BASE_HINT = getConfig().model?.split('/').pop() || '';

export function buildRequest(body) {
  return {
    model: getConfig().model,
    stream: true,
    temperature: 0.6,
    messages: [
      { role: 'system', content: systemPrompt() },
      { role: 'user', content: userPrompt(body) },
    ],
    ...(MODEL_BASE_HINT &&
      MODEL_BASE_HINT.includes('reasoning') && {
        reasoning: { effort: 'low' },
      }),
  };
}
