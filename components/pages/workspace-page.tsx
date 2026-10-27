'use client';
import { useForge } from '@/components/forge-provider';
import { date, money } from '@/lib/format';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Command,
  ExternalLink,
  Loader2,
  Plus,
  Users,
  Zap,
} from 'lucide-react';
export default function WorkspacePage() {
  const { workspace, view, show, hosted, myEvents, showTeams, card, navigate, error, loading } =
    useForge();
  if (loading)
    return (
      <div className="loading">
        <Loader2 className="spin" />
        Loading your workspace
      </div>
    );
  if (error)
    return (
      <section className="workspace">
        <p className="form-error" role="alert">
          {error}
        </p>
      </section>
    );
  return (
    <>
      {' '}
      <section className="workspace">
        <div className="section-heading">
          <div>
            <span className="eyebrow">YOUR WORKSPACE</span>
            <h1>{view === 'Organize' ? 'Run the show.' : 'Your next moves.'}</h1>
          </div>
          {view === 'Organize' && workspace.user && (
            <button className="button primary" onClick={() => show({ type: 'create' })}>
              <Plus size={18} />
              Create hackathon
            </button>
          )}
        </div>
        {!workspace.user ? (
          <div className="empty">
            <Users size={35} />
            <h3>
              {view === 'Organize'
                ? 'Bring your hackathon to life.'
                : 'Keep your builds in one place.'}
            </h3>
            <p>Sign in to access your workspace.</p>
            <button className="button primary" onClick={() => show({ type: 'auth' })}>
              Get started <ArrowRight size={17} />
            </button>
          </div>
        ) : view === 'Organize' ? (
          <>
            <div className="stats">
              <div>
                <span>HACKATHONS</span>
                <strong>{hosted.length.toString().padStart(2, '0')}</strong>
              </div>
              <div>
                <span>REGISTERED TEAMS</span>
                <strong>
                  {hosted
                    .reduce((a, e) => a + e.registrations, 0)
                    .toString()
                    .padStart(2, '0')}
                </strong>
              </div>
              <div>
                <span>PRIZE POOL</span>
                <strong>{money(hosted.reduce((a, e) => a + e.prize, 0))}</strong>
              </div>
            </div>
            {hosted.length ? (
              <div className="hosted-list">
                {hosted.map((e) => (
                  <article className="hosted-event" key={e.id}>
                    <div className={`event-initial ${e.color}`}>
                      <Zap size={25} />
                    </div>
                    <div>
                      <h3>{e.title}</h3>
                      <p>
                        {date(e.startsAt)} · {e.registrations} teams · {e.capacity} capacity
                      </p>
                    </div>
                    <button className="button small" onClick={() => showTeams(e)}>
                      View teams <ArrowUpRight size={17} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`View ${e.title}`}
                      onClick={() => show({ type: 'event', event: e })}
                    >
                      <ExternalLink size={19} />
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty">
                <Command size={35} />
                <h3>No hackathons yet.</h3>
                <p>Set the challenge. Let people build.</p>
                <button className="button primary" onClick={() => show({ type: 'create' })}>
                  Create your first hackathon <Plus size={17} />
                </button>
              </div>
            )}
          </>
        ) : myEvents.length ? (
          <>
            <div className="workspace-note">
              <Check size={18} />
              {myEvents.length} registered ·{' '}
              {workspace.registrations.filter((r) => r.submission).length} projects submitted
            </div>
            <div className="event-grid workspace-grid">
              {myEvents.map((e, i) => card(e, i, true))}
            </div>
          </>
        ) : (
          <div className="empty">
            <CalendarDays size={35} />
            <h3>Your next build is out there.</h3>
            <p>Register for a hackathon to see your team and submission here.</p>
            <button className="button primary" onClick={() => navigate('Explore')}>
              Explore hackathons <ArrowRight size={17} />
            </button>
          </div>
        )}
      </section>
    </>
  );
}
