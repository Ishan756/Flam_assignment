import React, { useEffect, useRef, useState } from 'react';
import { gsap } from '../lib/anim.js';
import Markdown from './Markdown.jsx';

export default function Quiz({ deck, state, setState }) {
  const { redo } = state;
  const retestMode = redo && redo.length > 0;
  const activeIndices = retestMode ? redo : deck.quiz.map((_q, i) => i);

  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({});
  const [run, setRun] = useState(0);
  const [finished, setFinished] = useState(false);

  const listRef = useRef(null);
  const scoreRef = useRef(null);

  const total = activeIndices.length;
  const answered = activeIndices.filter((i) => answers[i] !== undefined).length;
  const isCorrect = (i) => answers[i] === deck.quiz[i].answerIndex;
  const correctCount = activeIndices.filter(isCorrect).length;
  const pct = total ? Math.round((correctCount / total) * 100) : 0;

  // Stagger questions in on each new run.
  useEffect(() => {
    if (listRef.current) {
      const anim = gsap.fromTo(
        listRef.current.querySelectorAll('.question'),
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.06, ease: 'power3.out', clearProps: 'all' },
      );
      return () => anim.kill();
    }
  }, [run, retestMode]);

  // Count-up the displayed score when finishing.
  useEffect(() => {
    if (finished && scoreRef.current) {
      gsap.fromTo(
        scoreRef.current,
        { innerText: 0 },
        { innerText: pct, snap: { innerText: 1 }, duration: 0.9, ease: 'power2.out' },
      );
    }
  }, [finished, pct]);

  const choose = (i, opt, el) => {
    if (revealed[i]) return;
    setAnswers((a) => ({ ...a, [i]: opt }));
    if (el) {
      gsap.fromTo(el, { scale: 0.98 }, { scale: 1, duration: 0.25, ease: 'power2.out' });
    }
  };

  const reveal = (i) => {
    if (answers[i] === undefined) return;
    setRevealed((r) => ({ ...r, [i]: true }));
  };

  const finish = () => {
    const stillWrong = activeIndices.filter((i) => !isCorrect(i));
    const newRedo = (retestMode ? redo : deck.quiz.map((_q, i) => i)).filter((i) =>
      stillWrong.includes(i),
    );
    setState((s) => ({
      redo: newRedo,
      correct: (s.correct || 0) + activeIndices.filter(isCorrect).length,
      attempts: (s.attempts || 0) + total,
    }));
    setFinished(true);
  };

  const resetRun = (retest) => {
    setAnswers({});
    setRevealed({});
    setFinished(false);
    setRun((r) => r + 1);
    if (retest) setState((s) => ({ ...s, redo: s.redo.slice() }));
  };

  const doneRetesting = finished && retestMode && (state.redo || []).length === 0;

  if (doneRetesting) {
    return (
      <div className="quiz-panel">
        <div className="climax">
          <div className="climax-ring">
            <span className="climax-icon">🏆</span>
          </div>
          <h3>All cleared!</h3>
          <p>You answered every missed question correctly.</p>
          <button className="primary" onClick={() => resetRun(false)}>
            Redo full quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-panel">
      <div className="quiz-head">
        <div className="quiz-progress">
          <span className="quiz-label">
            {retestMode
              ? `Retesting ${total} missed question${total === 1 ? '' : 's'}`
              : `${answered}/${total} answered`}
          </span>
          <div className="progress-track tall">
            <div className="progress-fill" style={{ width: `${(answered / total) * 100}%` }} />
          </div>
        </div>
        {finished && (
          <div className={`result-badge ${pct >= 70 ? 'good' : 'meh'}`}>
            Score <span ref={scoreRef}>{pct}</span>% · {correctCount}/{total}
          </div>
        )}
      </div>

      <div className="quiz-list" key={`${run}-${retestMode}`} ref={listRef}>
        {activeIndices.map((i) => {
          const q = deck.quiz[i];
          const chose = answers[i];
          const show = revealed[i];
          const correct = isCorrect(i);
          return (
            <div key={i} className={`question ${show ? (correct ? 'correct' : 'incorrect') : ''}`}>
              <div className="q-text">
                <span className="q-num">{i + 1}.</span>
                <Markdown text={q.question} />
              </div>
              <div className="options">
                {q.options.map((opt, oi) => {
                  let cls = 'option';
                  if (show) {
                    if (oi === q.answerIndex) cls += ' right';
                    else if (oi === chose) cls += ' wrong';
                    else cls += ' dim';
                  } else if (chose === oi) {
                    cls += ' chosen';
                  }
                  return (
                    <button
                      key={oi}
                      className={cls}
                      onClick={(e) => choose(i, oi, e.currentTarget)}
                      disabled={show}
                    >
                      <span className="opt-letter">{String.fromCharCode(65 + oi)}</span>
                      <Markdown text={opt} />
                    </button>
                  );
                })}
              </div>
              {show && (
                <div className="explain">
                  <strong className={correct ? 'ok' : 'no'}>
                    {correct ? '✓ Correct' : `✗ Correct answer: ${q.options[q.answerIndex]}`}
                  </strong>
                  {q.explanation && <Markdown text={q.explanation} />}
                </div>
              )}
              {!show && chose !== undefined && (
                <button className="ghost reveal-btn" onClick={() => reveal(i)}>
                  Reveal answer
                </button>
              )}
            </div>
          );
        })}
      </div>

      {answered === total && !finished ? (
        <div className="quiz-footer">
          <button className="primary" onClick={finish}>
            Finish &amp; see score
          </button>
        </div>
      ) : (
        finished && (
          <div className="quiz-footer actions">
            {retestMode ? (
              <button className="primary" onClick={() => resetRun(true)}>
                Retest remaining ({state.redo.length})
              </button>
            ) : (
              <>
                <button className="primary" onClick={() => resetRun(false)}>
                  Restart quiz
                </button>
                {state.redo.length > 0 && (
                  <button className="ghost" onClick={() => resetRun(true)}>
                    Retest {state.redo.length} missed
                  </button>
                )}
              </>
            )}
            {!retestMode && pct < 70 && (
              <button className="ghost" onClick={() => resetRun(false)}>
                Review all again
              </button>
            )}
          </div>
        )
      )}
    </div>
  );
}
