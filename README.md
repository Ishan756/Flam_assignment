# Study Assistant

> Frontend Internship Assignment — the **Study assistant** option.
> Paste notes or a topic → an LLM returns structured flashcards + a quiz → your app
> renders them as interactive, flippable cards with a self-testing quiz (including
> re-testing wrong answers). **Not a chatbot.**

## Features

- **Free-form text input** — paste notes or just type a topic.
- **Real LLM API** — the model call is routed through a small **Node/Express backend**
  (the API key never ships to the browser). Provider-agnostic: works with OpenRouter,
  Groq, Gemini, OpenAI, or a local **Ollama** server via an OpenAI-compatible endpoint.
- **Structured output** — the model returns strict JSON (`{ flashcards: [...], quiz: [...] }`)
  which the app validates, then renders as interactive components.
- **Flashcards** — click to flip front/back, mark "got it" / "redo".
- **Quiz** — multiple-choice questions with instant feedback and a score; wrong answers
  are collected and you can **re-test just the ones you missed**.
- **Robust failure handling** — malformed JSON, wrong shape, slow/empty/failed responses
  and over-long responses are all handled: friendly errors, retries, no crashes, and a
  stale-response guard so an old result can never overwrite a newer one.
- **Streaming** — results appear progressively as they generate.
- **States** — loading, error, and empty states throughout.
- **Refinement loop** — ask follow-up prompts that edit the existing set instead of
  replacing everything (extra cards/questions are merged in).
- **Save & reload sessions** — everything is persisted to `localStorage`; your last
  session is restored on reload.
- **Mobile-friendly** — responsive layout; works on a phone.
- **Dark mode** — toggleable, persisted.
- **Demo mode** — no API key? A local "offline demo" generates realistic sample data so
  you can evaluate the UI without spending credits.

## Project structure

```
.
├── client/                 # React (Vite) SPA
│   ├── src/
│   │   ├── api.js          # talks to the backend (/api/study)
│   │   ├── components/     # Flashcard, Quiz, Markdown, etc.
│   │   ├── lib/            # validation + state helpers
│   │   └── App.jsx
│   └── ...
├── server/                 # Node/Express backend (LLM proxy)
│   ├── index.js
│   └── llm.js              # provider config, JSON extraction, streaming
└── package.json            # root scripts
```

## Setup

Requirements: **Node 18+** and **npm**.

> Note: this repo ships a project-local `.npmrc` that pins the **public npm registry** for
> installs. (Your machine's global npm points at an internal registry; the local override is
> scoped to this project and doesn't touch your global config.) Remove it if you don't need it.

```bash
# 1. install all dependencies (server + client + root tooling)
npm install
npm run install:all
```

> **Windows users:** if `vite` is "not recognized as an internal or external command"
> (often after deps were installed from a Linux/WSL shell), do a clean reinstall from
> **PowerShell** so npm creates the correct Windows `.cmd` launchers:
>
> ```powershell
> Remove-Item -Recurse -Force client/node_modules, server/node_modules, node_modules -ErrorAction SilentlyContinue
> npm install
> npm run install:all
> ```

### 2. Configure your AI provider

Copy `server/.env.example` to `server/.env` and fill it in.

The backend is **OpenAI-compatible**, so any provider works — you only change three
variables. Some examples:

```dotenv
# OpenRouter
AI_BASE_URL=https://openrouter.ai/api/v1
AI_API_KEY=sk-or-...            # get one at openrouter.ai (free models available)
AI_MODEL=meta-llama/llama-3.3-70b-instruct:free

# Groq
AI_BASE_URL=https://api.groq.com/openai/v1
AI_API_KEY=gsk_...
AI_MODEL=llama-3.3-70b-versatile

# Gemini (OpenAI-compatible endpoint)
AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
AI_API_KEY=AIza...
AI_MODEL=gemini-3.6-flash

# Local Ollama (no key needed — leave AI_API_KEY blank)
AI_BASE_URL=http://localhost:11434/v1
AI_API_KEY=
AI_MODEL=qwen2.5:7b
```

> **Security note (per the assignment's "API key" requirement):** the key lives only in
> `server/.env`. The frontend never sees it — all model calls go through the backend.

### 3. Run it

```bash
npm run dev        # starts backend (http://localhost:4000) + client (http://localhost:5173)
```

Open **http://localhost:5173**.

If you don't set a provider key, the app automatically falls back to **Demo mode**
(generated sample data) so you can still click around.

## How the AI call works

1. The form sends your text to `POST /api/study` on the backend.
2. The backend builds a prompt asking for **strict JSON only** with this shape:

```json
{
  "flashcards": [{ "front": "...", "back": "..." }],
  "quiz": [{ "question": "...", "options": ["a", "b", "c", "d"], "answerIndex": 0, "explanation": "..." }]
}
```

3. It requests the response in **streaming chunks** and forwards them to the frontend
   (SSE). When finished, it validates the JSON and returns a finalized, cleaned object.
4. The frontend validates again (defensive), then renders. Any structural problem is
   surfaced as a readable error with a retry button.

## Refinement loop

After generating, choose **"Refine"** and type something like
*"add 3 more cards about fermions"* or *"make question 5 harder"*. The backend sends the
previous result plus your instruction and merges the new items in — it never wipes what
you already have.

## AI-usage note

Per the suggestion in the brief, the busy work was assisted but the structure, logic,
and code are reviewed and owned by the human. An LLM was not used to run the app itself —
the app calls the model through the backend as its core feature.

## Known limitations

- **Multiple-choice quizzes only** (single correct answer, `answerIndex`). No multi-select
  or free-text answers.
- Provider differences in **JSON reliability**: weaker local models occasionally return
  invalid JSON. The app does its best to repair (find the JSON block, retry, coerce), but
  a strong model produces the smoothest experience.
- **Ingredient/unit math is not included** (that's the fridge app, not this one).
- Text rendering uses a lightweight inline markdown parser; very complex markdown isn't supported.
- Sessions are stored in `localStorage` only (no backend persistence / account system).

## Time spent

~8 hours total (per the assignment's limit), broken into:

| Area | Time |
|------|------|
| Requirements analysis & design (data shape, architecture) | 0.5h |
| Backend LLM proxy: provider config, JSON extraction, streaming, demo fallback | 2h |
| Frontend: input, states, flashing card UI, quiz, mobile, dark mode | 3h |
| Refinement loop, session persistence, streaming UI | 1.5h |
| Polish, verification build, README | 1h |
