import React, { useEffect, useRef, useState } from 'react';
import { streamStudy } from './api.js';
import { sanitizeDeck, summarize } from './lib.js';
import { gsap } from './lib/anim.js';
import Flashcard from './components/Flashcard.jsx';
import Quiz from './components/Quiz.jsx';

const STORAGE_KEY = 'study-assistant-session-v1';
const THEME_KEY = 'study-assistant-theme';

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(state) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        deck: state.deck,
        source: state.source,
        flashStatus: state.flashStatus,
        quizState: state.quizState,
      }),
    );
  } catch {
    /* storage unavailable — ignore */
  }
}

const EXAMPLE = `Colligative properties

- Boiling-point elevation: adding a non-volatile solute raises the boiling point.
- Freezing-point depression: adding a solute lowers the freezing point.
- Osmotic pressure: flow of solvent across a semipermeable membrane.
- Vapor-pressure lowering (Raoult's law).

Key equation for elevation/depression: \u0394T = i \u00b7 K \u00b7 m
where i = van't Hoff factor, K = constant (Kb or Kf), m = molality.`;

export default function App() {
  const sessionRef = useRef(loadSession());
  const [deck, setDeck] = useState(sessionRef.current?.deck || null);
  const [source, setSource] = useState(sessionRef.current?.source || '');
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | loading | refining | ready | error
  const [streamText, setStreamText] = useState('');
  const [error, setError] = useState(null);
  const [flashStatus, setFlashStatus] = useState({});
  const [quizState, setQuizState] = useState({ redo: [], correct: 0, attempts: 0 });
  const [tab, setTab] = useState('cards');
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) === 'dark';
    } catch {
      return false;
    }
  });
  const [demo, setDemo] = useState(false);

  const viewRef = useRef(null);
  const studioRef = useRef(null);
  const resultCounterRef = useRef(0);

  const abortRef = useRef(null);
  const deckRef = useRef(deck);
  deckRef.current = deck;
  const latestRequestRef = useRef(0);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    } catch {}
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  useEffect(() => {
    if (deck) saveSession({ deck, source, flashStatus, quizState });
  }, [deck, source, flashStatus, quizState]);

  // Entrance animation for the visible view.
  useEffect(() => {
    if (viewRef.current && !deck) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          '.landing .anim-hero',
          { opacity: 0, y: 26, scale: 0.97 },
          { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'power3.out' },
        );
        gsap.fromTo(
          '.landing .anim',
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, delay: 0.15, ease: 'power2.out' },
        );
      }, viewRef);
      return () => ctx.revert();
    }
  }, [deck]);

  // Animate the studio view each time a deck is created/refined.
  useEffect(() => {
    if (deck && studioRef.current) {
      resultCounterRef.current += 1;
      const ctx = gsap.context(() => {
        gsap.fromTo(
          studioRef.current.querySelectorAll('.studio .anim-screen'),
          { opacity: 0, y: 20, scale: 0.985 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.5,
            stagger: 0.07,
            ease: 'power3.out',
            clearProps: 'all',
          },
        );
      }, studioRef);
      return () => ctx.revert();
    }
  }, [deck, source]);

  const run = async (text, { refine = false } = {}) => {
    const existing = refine ? deckRef.current : null;
    setPhase(refine ? 'refining' : 'loading');
    setError(null);
    setStreamText('');

    const controller = new AbortController();
    abortRef.current = controller;

    const requestNumber = Date.now();
    latestRequestRef.current = requestNumber;

    try {
      const result = await streamStudy({
        text,
        existing,
        signal: controller.signal,
        onDelta: (acc) => {
          if (requestNumber !== latestRequestRef.current) return;
          setStreamText(acc);
        },
      });

      const check = sanitizeDeck(result.deck);
      if (!check.ok) throw new Error(check.errors.join(' '));
      setDeck(check.deck);
      setDemo(Boolean(result.demo));
      setSource(refine ? text : text);
      setFlashStatus({});
      setQuizState({ redo: [], correct: 0, attempts: 0 });
      setTab('cards');
      setPhase('ready');
    } catch (err) {
      if (err.name === 'AbortError') {
        setPhase('ready');
        return;
      }
      setError(err.message || 'Something went wrong.');
      setPhase('error');
    } finally {
      abortRef.current = null;
    }
  };

  const handleGenerate = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || phase === 'loading' || phase === 'refining') return;
    run(text);
  };

  const handleRefine = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || phase === 'loading' || phase === 'refining') return;
    run(text, { refine: true });
  };

  const handleReset = () => {
    const el = viewRef.current;
    gsap.to(el, {
      opacity: 0,
      y: -14,
      duration: 0.18,
      ease: 'power2.in',
      onComplete: () => {
        gsap.set(el, { clearProps: 'all' });
        setDeck(null);
        setSource('');
        setError(null);
        setPhase('idle');
        setStreamText('');
        setFlashStatus({});
        setQuizState({ redo: [], correct: 0, attempts: 0 });
        setDemo(false);
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
      },
    });
  };

  const loading = phase === 'loading' || phase === 'refining';
  const hasDeck = Boolean(deck);

  return (
    <div className="app">
      <div className="bg" aria-hidden="true">
        <div className="orb orb-a" />
        <div className="orb orb-b" />
        <div className="orb orb-c" />
        <div className="grid-overlay" />
      </div>

      <header className="topbar">
        <div className="brand">
          <span className="logo-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path
                d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </span>
          <div className="brand-text">
            <h1>Study Assistant</h1>
            <p className="tagline">Notes → flashcards &amp; quiz, not a chat</p>
          </div>
        </div>
        <div className="top-actions">
          {demo && <span className="badge demo">Demo mode</span>}
          <button
            className="icon-btn"
            onClick={() => setDark((d) => !d)}
            title="Toggle dark mode"
            aria-label="Toggle dark mode"
          >
            {dark ? '☀️' : '🌙'}
          </button>
          {hasDeck && (
            <button className="icon-btn" onClick={handleReset} title="New session">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          )}
        </div>
      </header>

      <main className="container">
        {!hasDeck ? (
          <section className="landing" ref={viewRef}>
            <div className="hero anim-hero">
              <span className="eyebrow">Frontend Internship · Study Assistant</span>
              <h2 className="hero-title">
                Turn your notes into
                <br />
                <span className="grad">flashcards</span> &amp; a <span className="grad">quiz</span>
              </h2>
              <p className="intro">
                Paste your notes or type a topic. The AI returns structured data — and this app parses it
                into <strong>flippable cards</strong> and a <strong>self-grading quiz</strong>. Deliberately{' '}
                <em>not a chatbot</em>.
              </p>
            </div>

            <form className="input-card glass anim" onSubmit={handleGenerate}>
              <div className="input-head">
                <label htmlFor="study-input">Notes or topic</label>
                <button type="button" className="mini-link" onClick={() => setInput(EXAMPLE)}>
                  Load example ↺
                </button>
              </div>
              <div className="textarea-wrap">
                <textarea
                  id="study-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="e.g. Explain colligative properties of solutions…"
                  rows={6}
                  autoFocus
                />
                <span className="char-count">{input.length}</span>
              </div>
              <div className="input-row">
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="primary cta"
                >
                  {loading ? 'Generating…' : 'Generate study deck'}
                  {!loading && (
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              </div>
            </form>

            {phase === 'error' && (
              <div className="error banner glass anim" role="alert">
                <div className="err-ic" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                </div>
                <span>
                  <strong>Oops.</strong> {error}
                </span>
                <button className="primary small" onClick={() => run(input, { refine: false })}>
                  Retry
                </button>
              </div>
            )}

            {phase === 'loading' && (
              <div className="generating anim">
                <div className="gen-orbs" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <p>Asking the model for structured cards…</p>
                {streamText && <pre className="stream">{summarize(streamText, 460)}</pre>}
              </div>
            )}
          </section>
        ) : (
          <section className="studio" ref={studioRef}>
            <div className="source-bar anim-screen">
              <span className="source-label">Source</span>
              <span className="source-text" title={source}>
                {summarize(source, 90)}
              </span>
              {demo && <span className="badge demo">Demo</span>}
            </div>

            <div className="tabs anim-screen" role="tablist">
              <div className="tab-rail">
                {[
                  ['cards', `Flashcards`, deck.flashcards.length],
                  ['quiz', `Quiz`, deck.quiz.length],
                ].map(([key, label, count]) => (
                  <button
                    key={key}
                    className={`tab ${tab === key ? 'active' : ''}`}
                    onClick={() => setTab(key)}
                  >
                    <span className="tab-label">{label}</span>
                    <span className="tab-count">{count}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="anim-screen" key={`${tab}-${source}`}>
              {tab === 'cards' ? (
                <Flashcard cards={deck.flashcards} status={flashStatus} setStatus={setFlashStatus} />
              ) : (
                <Quiz deck={deck} state={quizState} setState={setQuizState} />
              )}
            </div>

            <div className="refine-card glass anim-screen">
              <div className="input-head">
                <label htmlFor="refine-input">Refine the deck</label>
                <span className="mini-hint">asks to edit the existing result</span>
              </div>
              <div className="refine-row">
                <input
                  id="refine-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder='e.g. "add 3 cards on Raoult’s law" or "make question 4 harder"'
                />
                <button className="primary" onClick={handleRefine} disabled={loading || !input.trim()}>
                  {phase === 'refining' ? 'Refining…' : 'Refine'}
                </button>
              </div>
              {phase === 'refining' && (
                <div className="inline-status">
                  <div className="spinner small" aria-hidden="true" />
                  <span>Merging your changes…</span>
                </div>
              )}
            </div>

            {phase === 'error' && (
              <div className="error banner glass anim-screen" role="alert">
                <div className="err-ic" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                </div>
                <span>
                  <strong>Oops.</strong> {error}
                </span>
                <button className="primary small" onClick={() => setPhase('ready')}>
                  Done
                </button>
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="footer">
        The only chat here is the one you didn’t build. Model calls stay server-side.
      </footer>
    </div>
  );
}
