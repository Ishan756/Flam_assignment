export function demoDeck() {
  return {
    flashcards: [
      {
        front: 'What is a "free-form text input"?',
        back: 'An unstructured text field where the user can type a topic or paste raw notes, as opposed to fixed multiple-choice fields.',
      },
      {
        front: 'Why must the app "not be a chatbot"?',
        back: 'The requirement is to parse structured data and render interactive components (cards, quiz), not to echo raw model text in a chat box.',
      },
      {
        front: 'What does structured output mean here?',
        back: 'The LLM returns JSON (e.g. { flashcards, quiz }) that the frontend validates and renders as stateful UI.',
      },
      {
        front: 'Name the required states.',
        back: 'Loading, error, and empty states — especially for malformed JSON, wrong shape, slow/empty/failed or stale responses.',
      },
      {
        front: 'How is a real LLM API key kept safe?',
        back: 'It lives only in the backend (server/.env). The model call is routed through a small backend/serverless function, never shipped in the browser.',
      },
      {
        front: 'What is the refinement loop?',
        back: 'Follow-up prompts that edit the existing result (add/merge cards) instead of regenerating everything from scratch.',
      },
    ],
    quiz: [
      {
        question: 'Which rule is NON-negotiable in the assignment?',
        options: ['The app must use TypeScript', 'It cannot be a chatbot', 'It must be deployed', 'It must require login'],
        answerIndex: 1,
        explanation: 'The firm rule: the AI returns structured data your code parses and renders — not a chatbot printing raw text.',
      },
      {
        question: 'Roughly how many hours should the assignment take?',
        options: ['4 hours', '8 hours', '20 hours', 'No limit'],
        answerIndex: 1,
        explanation: 'Aim for ~8 hours of actual work total; stop there and note what you would do next.',
      },
      {
        question: 'What is allowed regarding AI tools and SDKs?',
        options: ['Nothing is allowed', 'Only AI SDKs, no tools', 'Yes — as long as you understand your code', 'Only open models'],
        answerIndex: 2,
        explanation: 'AI tools and AI SDKs are allowed — just be ready to explain what they do.',
      },
      {
        question: 'Which of these is a stretch (optional) feature?',
        options: ['Works on mobile', 'Handles bad output', 'Saving and reloading sessions', 'Returning different block kinds (card, chart, checklist)'],
        answerIndex: 3,
        explanation: 'Multi-block rendering, streaming, refinement loops and session persistence are optional stretch goals.',
      },
    ],
  };
}
