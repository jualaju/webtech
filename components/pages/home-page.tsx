'use client';
import { useForge } from '@/components/forge-provider';
import {
  ArrowDown,
  ArrowDownLeft,
  ArrowUpRight,
  Code2,
  Loader2,
  Terminal,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
export default function HomePage() {
  const { workspace, loading, error, card, pending, show } = useForge();
  const router = useRouter();
  useEffect(() => {
    if (workspace.user) router.replace('/dashboard');
  }, [workspace.user, router]);
  if (loading || workspace.user)
    return (
      <div className="loading">
        <Loader2 className="spin" />
        Loading your workspace
      </div>
    );
  return (
    <>
      {' '}
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="tiny-star">✳</span> FOR THE ONES WHO BUILD.
          </div>
          <h1>
            Less talk.
            <br />
            More{' '}
            <span className="build-word">
              building.
              <svg viewBox="0 0 440 20" preserveAspectRatio="none" aria-hidden="true">
                <path d="M4 13 Q160 -4 435 9 M15 19 Q220 4 425 15" />
              </svg>
            </span>
          </h1>
          <p>
            Find your next hackathon.
            <br />
            Meet your people. Ship something real.
          </p>
          <Link className="button black" href="/hackathons">
            Find your next build <ArrowDown size={19} />
          </Link>
          <div className="hero-note">
            <span className="mini-avatars">
              <b>↗</b>
              <b>✳</b>
              <b>⌘</b>
            </span>
            <span>Big ideas. Small teams.</span>
          </div>
        </div>
        <div className="hero-art" aria-label="Build, break, repeat illustration">
          <div className="grid-paper" />
          <div className="art-sticker sticker-top mono">IDEA → PROTOTYPE → SHIP</div>
          <div className="code-window">
            <div className="window-bar">
              <span />
              <span />
              <span />
              <Terminal size={17} />
            </div>
            <div className="window-content">
              <span className="code-comment">// your next big thing</span>
              <p>
                <em>const</em> idea = <span>"what if?"</span>;
              </p>
              <p>
                <em>while</em> (curious) {'{'}
              </p>
              <p className="indent">build();</p>
              <p className="indent">break();</p>
              <p className="indent highlight">makeItBetter();</p>
              <p>{'}'}</p>
              <span className="code-cursor">▍</span>
            </div>
          </div>
          <div className="art-star">✳</div>
          <div className="ship-sticker">
            <ArrowUpRight size={33} />
            <span>
              JUST
              <br />
              SHIP IT.
            </span>
          </div>
          <div className="art-sticker sticker-bottom">
            <span className="green-dot" /> Your next idea starts here.
          </div>
          <ArrowDownLeft className="art-arrow" size={65} />
        </div>
      </section>
      <div className="ticker" aria-hidden="true">
        <span>BUILD SOMETHING THAT MATTERS</span>
        <span>✳</span>
        <span>FIND YOUR PEOPLE</span>
        <span>✳</span>
        <span>MAKE. BREAK. REPEAT.</span>
        <span>✳</span>
        <span>BUILD SOMETHING THAT MATTERS</span>
        <span>✳</span>
      </div>
      <section className="home-shortcuts">
        <Link href="/hackathons">
          <Code2 />
          <strong>Find a challenge</strong>
          <span>Less scrolling, more shipping.</span>
          <ArrowUpRight />
        </Link>
        <Link href="/feed">
          <Users />
          <strong>Meet the chaos crew</strong>
          <span>Team up. Talk shop. Touch grass later.</span>
          <ArrowUpRight />
        </Link>
        <Link href="/toolkit">
          <Terminal />
          <strong>Open your toolkit</strong>
          <span>Focus timer. Pitch prep. Team names.</span>
          <ArrowUpRight />
        </Link>
      </section>
      <section className="featured-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">NEXT ON YOUR CALENDAR</span>
            <h2>Pick your next plot twist.</h2>
          </div>
          <Link className="text-link" href="/hackathons">
            All hackathons <ArrowUpRight size={17} />
          </Link>
        </div>
        {loading ? (
          <div className="loading">
            <Loader2 className="spin" />
            Loading hackathons
          </div>
        ) : error ? (
          <p className="form-error">{error}</p>
        ) : (
          <div className="event-grid featured-grid">
            {workspace.events.slice(0, 3).map((e, i) => card(e, i))}
          </div>
        )}
      </section>
      <section className="feed-teaser">
        <div>
          <span className="eyebrow">OVERHEARD AT 3 AM</span>
          <h2>“It works on my machine.”</h2>
          <p>Cool. Are we submitting your machine?</p>
          <Link className="button" href="/feed">
            Enter the group chat <ArrowUpRight size={18} />
          </Link>
        </div>
        <span className="teaser-stamp">
          BUILD
          <br />
          BREAK
          <br />
          BANTER.
        </span>
      </section>{' '}
      <section className="host-banner">
        <div className="host-symbol">✳</div>
        <div>
          <span className="eyebrow">PASS THE MIC.</span>
          <h2>
            Your campus.
            <br />
            Your next big build.
          </h2>
        </div>
        <button
          className="button black"
          onClick={() => {
            if (!workspace.user) pending.current = { type: 'create' };
            show(workspace.user ? { type: 'create' } : { type: 'auth' });
          }}
        >
          Host a hackathon <ArrowUpRight size={19} />
        </button>
      </section>
    </>
  );
}
