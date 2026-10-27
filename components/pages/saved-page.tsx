'use client';
import { useForge } from '@/components/forge-provider';
import { ArrowUpRight, Bookmark, Loader2 } from 'lucide-react';
import Link from 'next/link';
export default function SavedPage() {
  const { workspace, loading, error, card, show } = useForge();
  const saved = workspace.events.filter((e) => workspace.savedEventIds.includes(e.id));
  return (
    <section className="workspace">
      <div className="section-heading">
        <div>
          <span className="eyebrow">THE MAYBE-THIS-WEEKEND PILE</span>
          <h1>
            For later.
            <br />
            <span className="marker-lime">Not forever.</span>
          </h1>
        </div>
        <Link className="text-link" href="/hackathons">
          Find more builds <ArrowUpRight size={17} />
        </Link>
      </div>
      {loading ? (
        <div className="loading">
          <Loader2 className="spin" />
          Loading saved hackathons
        </div>
      ) : error ? (
        <p className="form-error">{error}</p>
      ) : !workspace.user ? (
        <div className="empty">
          <Bookmark size={32} />
          <h3>Make a little shortlist.</h3>
          <p>Log in to keep saved hackathons across your devices.</p>
          <button className="button primary" onClick={() => show({ type: 'auth' })}>
            Log in to save <ArrowUpRight size={17} />
          </button>
        </div>
      ) : saved.length ? (
        <div className="event-grid workspace-grid">{saved.map((e, i) => card(e, i))}</div>
      ) : (
        <div className="empty">
          <Bookmark size={32} />
          <h3>Nothing in the maybe pile. Yet.</h3>
          <p>Hit the bookmark on a hackathon that catches your eye.</p>
          <Link className="button primary" href="/hackathons">
            Explore hackathons <ArrowUpRight size={17} />
          </Link>
        </div>
      )}
    </section>
  );
}
