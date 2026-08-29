import React, { useEffect, useRef, useState } from 'react';
import { gsap } from '../lib/anim.js';
import Markdown from './Markdown.jsx';

export default function Flashcard({ cards, status, setStatus }) {
  const [flipped, setFlipped] = useState({});
  const [filter, setFilter] = useState('all'); // all | learning | done
  const gridRef = useRef(null);
  const countRef = useRef(null);
  const entryDone = useRef(false);

  const toggle = (i) => setFlipped((f) => ({ ...f, [i]: !f[i] }));

  const mark = (i, val) => {
    setStatus((s) => ({ ...s, [i]: val }));
    setFlipped((f) => ({ ...f, [i]: false }));
  };

  const items = cards
    .map((c, i) => ({ c, i }))
    .filter(({ i }) => {
      if (filter === 'learning') return status[i] !== 'done';
      if (filter === 'done') return status[i] === 'done';
      return true;
    });

  const counts = cards.reduce(
    (acc, _c, i) => {
      if (status[i] === 'done') acc.done += 1;
      else acc.learning += 1;
      return acc;
    },
    { done: 0, learning: 0 },
  );

  const progress = cards.length ? Math.round((counts.done / cards.length) * 100) : 0;

  // One-time staggered entrance for the card grid.
  useEffect(() => {
    if (gridRef.current) {
      const cardsHere = gridRef.current.querySelectorAll('.card');
      const anim = gsap.fromTo(
        cardsHere,
        { opacity: 0, y: 26, rotateX: 8, scale: 0.96 },
        { opacity: 1, y: 0, rotateX: 0, scale: 1, duration: 0.5, stagger: 0.05, ease: 'power3.out', clearProps: 'all' },
      );
      return () => anim.kill();
    }
  }, [filter, cards]);

  // Animate the progress bar + label whenever progress changes.
  useEffect(() => {
    if (countRef.current) {
      gsap.fromTo(
        countRef.current,
        { innerText: Math.max(0, progress - 12) },
        {
          innerText: progress,
          snap: { innerText: 1 },
          duration: 0.6,
          ease: 'power1.out',
        },
      );
    }
  }, [progress]);

  const flip = (i, el) => {
    if (!el) return;
    const card = el.closest('.card');
    if (!card) return;
    const going = !flipped[i];
    setFlipped((f) => ({ ...f, [i]: going }));
    gsap.to(card, {
      rotateY: going ? 180 : 0,
      duration: 0.55,
      ease: 'power2.inOut',
      transformPerspective: 1000,
      onComplete: () => gsap.set(card, { clearProps: 'transform' }),
    });
  };

  return (
    <div className="flashcard-panel">
      <div className="panel-head">
        <div className="progress">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span>
            <span ref={countRef}>{progress}</span>% mastered · {counts.done}/{cards.length}
          </span>
        </div>
        <div className="segmented">
          {[
            ['all', `All`, cards.length],
            ['learning', `Learning`, counts.learning],
            ['done', `Done`, counts.done],
          ].map(([key, label, num]) => (
            <button
              key={key}
              className={`seg ${filter === key ? 'active' : ''}`}
              onClick={() => setFilter(key)}
            >
              {label} <span className="seg-num">{num}</span>
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎉</div>
          <p>No cards here yet.</p>
          {filter === 'done' && counts.learning === 0 && (
            <p>You’ve mastered every card — great work!</p>
          )}
        </div>
      ) : (
        <div className="card-grid" ref={gridRef}>
          {items.map(({ c, i }) => (
            <div
              key={i}
              className={`card ${flipped[i] ? 'is-flipped' : ''} ${status[i] === 'done' ? 'done' : ''}`}
              onClick={(e) => flip(i, e.currentTarget)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && flip(i, e.currentTarget)}
            >
              <div className="card-inner">
                <div className="card-face front">
                  <span className="card-idx">{i + 1}</span>
                  <Markdown text={c.front} />
                  {status[i] === 'done' && <span className="done-tag">✓ mastered</span>}
                  <span className="hint">Tap to flip</span>
                </div>
                <div className="card-face back">
                  <Markdown text={c.back} />
                </div>
              </div>
              <div
                className="card-actions"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <button className="ghost" onClick={() => mark(i, 'learning')} title="Mark for review">
                  ↺ Redo
                </button>
                <button className="primary small" onClick={() => mark(i, 'done')} title="Mark mastered">
                  ✓ Got it
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
