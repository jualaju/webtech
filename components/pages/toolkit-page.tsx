'use client';
import { useForge } from '@/components/forge-provider';
import {
  ArrowUpRight,
  Check,
  CheckSquare,
  Copy,
  Mic2,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  Timer,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
const checklist = [
  'The repo runs on someone else’s laptop.',
  'The deployed app opens without a login from your personal account.',
  'Secrets are in environment variables. Not Git.',
  'The demo covers one complete user journey.',
  'There’s a README with setup steps.',
  'The submission link actually opens.',
  'We have a screen recording. Wi-Fi has trust issues.',
];
const names = [
  'Merge Confetti',
  'The Missing Semicolons',
  'Ctrl Alt Elite',
  '404 Sleep Not Found',
  'Git Happens',
  'The Scope Creeps',
  'Null & Void',
  'Ship Happens',
  'Runtime Rebels',
  'Caffeine Overflow',
  'The Last Commit',
  'Probably Compiles',
  'Stack Snackers',
  'No Sleep Till Deploy',
];
export default function ToolkitPage() {
  const { setNotice } = useForge();
  const [duration, setDuration] = useState(25),
    [remaining, setRemaining] = useState(1500),
    [running, setRunning] = useState(false),
    [name, setName] = useState('The Missing Semicolons'),
    [checks, setChecks] = useState<boolean[]>(Array(checklist.length).fill(false)),
    [ready, setReady] = useState(false);
  const target = useRef(0);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('forge-launch-checks') || '[]');
      if (Array.isArray(stored)) setChecks(checklist.map((_, i) => stored[i] === true));
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem('forge-launch-checks', JSON.stringify(checks));
      } catch {
        /* Storage may be disabled by browser settings. */
      }
    }
  }, [checks, ready]);
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((target.current - Date.now()) / 1000));
      setRemaining(left);
      if (!left) {
        setRunning(false);
        setNotice('Focus session done. Stand up. Drink water. Unclench your jaw.');
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [running, setNotice]);
  const completed = checks.filter(Boolean).length;
  return (
    <section className="toolkit-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">LESS PANIC. MORE PROTOTYPE.</span>
          <h1>
            The builder’s
            <br />
            <span className="marker-orange">survival kit.</span>
          </h1>
        </div>
        <p>A little focus. A little prep. A much better demo.</p>
      </div>
      <div className="toolkit-grid">
        <section className="tool-card focus-card">
          <div className="tool-card-heading">
            <span className="eyebrow">
              <Timer size={16} /> FOCUS MODE
            </span>
            <span className="tool-number">01</span>
          </div>
          <h2>One tab. One task.</h2>
          <div className="timer-options">
            {[15, 25, 50].map((min) => (
              <button
                key={min}
                className={duration === min ? 'selected' : ''}
                onClick={() => {
                  setDuration(min);
                  setRemaining(min * 60);
                  setRunning(false);
                }}
              >
                {min} min
              </button>
            ))}
          </div>
          <div className="timer-display" role="timer" aria-label="Focus time remaining">
            {Math.floor(remaining / 60)
              .toString()
              .padStart(2, '0')}
            <span>:</span>
            {(remaining % 60).toString().padStart(2, '0')}
          </div>
          <div className="timer-actions">
            <button
              className="button black"
              onClick={() => {
                if (running) setRunning(false);
                else {
                  target.current = Date.now() + (remaining || duration * 60) * 1000;
                  setRunning(true);
                }
              }}
            >
              {running ? <Pause size={17} /> : <Play size={17} />}{' '}
              {running ? 'Pause' : 'Start focus'}
            </button>
            <button
              className="icon-button"
              aria-label="Reset focus timer"
              onClick={() => {
                setRunning(false);
                setRemaining(duration * 60);
              }}
            >
              <RotateCcw size={20} />
            </button>
          </div>
          <p className="tool-note">Runs while this page is open. Your 47 browser tabs can wait.</p>
        </section>
        <section className="tool-card name-card purple">
          <div className="tool-card-heading">
            <span className="eyebrow">
              <Shuffle size={16} /> TEAM NAME EMERGENCY
            </span>
            <span className="tool-number">02</span>
          </div>
          <h2>
            Great team.
            <br />
            Terrible at naming it?
          </h2>
          <div className="generated-name" aria-live="polite">
            {name}
          </div>
          <div className="timer-actions">
            <button
              className="button"
              onClick={() =>
                setName((current) => {
                  const other = names.filter((n) => n !== current);
                  return other[Math.floor(Math.random() * other.length)];
                })
              }
            >
              <Shuffle size={17} />
              Give us another
            </button>
            <button
              className="icon-button"
              aria-label="Copy team name"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(name);
                  setNotice('Team name copied. Go make it legendary.');
                } catch {
                  setNotice('Clipboard unavailable. Select the team name to copy it.');
                }
              }}
            >
              <Copy size={20} />
            </button>
          </div>
          <p className="tool-note">No more “Team Final Final v3”. You deserve better.</p>
        </section>
        <section className="tool-card launch-card">
          <div className="tool-card-heading">
            <span className="eyebrow">
              <CheckSquare size={16} /> BEFORE YOU HIT SUBMIT
            </span>
            <span className="tool-number">03</span>
          </div>
          <div className="launch-heading">
            <h2>
              The “please don’t
              <br />
              break on stage” checklist.
            </h2>
            <span>
              {completed}/{checklist.length}
            </span>
          </div>
          <div className="check-progress">
            <span style={{ width: `${(completed / checklist.length) * 100}%` }} />
          </div>
          <div className="launch-checks">
            {checklist.map((item, i) => (
              <label key={item} className={checks[i] ? 'done' : ''}>
                <input
                  type="checkbox"
                  checked={checks[i]}
                  onChange={(e) =>
                    setChecks((old) => old.map((v, j) => (j === i ? e.target.checked : v)))
                  }
                />
                <span className="check-box">{checks[i] && <Check size={14} />}</span>
                <span>{item}</span>
              </label>
            ))}
          </div>
          <span className="tool-note">
            Saved in this browser. The project still needs you to do the actual work.
          </span>
        </section>
        <section className="tool-card pitch-card orange">
          <div className="tool-card-heading">
            <span className="eyebrow">
              <Mic2 size={16} /> THE THREE-MINUTE PITCH
            </span>
            <span className="tool-number">04</span>
          </div>
          <h2>
            Show the thing.
            <br />
            Skip the TED talk.
          </h2>
          <ol className="pitch-steps">
            <li>
              <span>00:00</span>
              <div>
                <strong>The problem</strong>
                <p>Who’s struggling, and with what?</p>
              </div>
            </li>
            <li>
              <span>00:30</span>
              <div>
                <strong>The actual demo</strong>
                <p>One clean journey from start to finish.</p>
              </div>
            </li>
            <li>
              <span>02:00</span>
              <div>
                <strong>How you built it</strong>
                <p>The choices that made it work.</p>
              </div>
            </li>
            <li>
              <span>02:40</span>
              <div>
                <strong>What’s next</strong>
                <p>One honest limit. One clear next step.</p>
              </div>
            </li>
          </ol>
          <Link href="/dashboard" className="text-link">
            Go ship your submission <ArrowUpRight size={16} />
          </Link>
        </section>
      </div>
    </section>
  );
}
