'use client';
import { useForge } from '@/components/forge-provider';
import { date, money, isRegistrationOpen as open } from '@/lib/format';
import type { Hackathon } from '@/lib/types';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ExternalLink,
  Loader2,
  MapPin,
  Trophy,
  Users,
} from 'lucide-react';
import Link from 'next/link';
export default function EventPage({ id }: { id: string }) {
  const {
    workspace,
    loading,
    error,
    setNotice,
    bookmark,
    action,
    busy,
    formError,
    show,
    showTeams,
    close,
    navigate,
  } = useForge();
  const event = workspace.events.find((e) => e.id === id);
  if (loading)
    return (
      <div className="loading">
        <Loader2 className="spin" />
        Loading the brief
      </div>
    );
  if (error)
    return (
      <section className="workspace">
        <p className="form-error">{error}</p>
      </section>
    );
  if (!event)
    return (
      <section className="workspace">
        <div className="empty">
          <h1>That build is off the radar.</h1>
          <p>This hackathon doesn’t exist.</p>
          <Link href="/hackathons" className="button">
            Explore hackathons
          </Link>
        </div>
      </section>
    );
  return (
    <section className="event-page">
      <Link className="back-link" href="/hackathons">
        ← Back to hackathons
      </Link>
      <div className="event-page-grid">
        <article className="event-brief">
          <div className={`detail-heading ${event.color}`}>
            <span className="eyebrow">{event.track}</span>
            <h1>{event.title}</h1>
            <span>by {event.organizer}</span>
          </div>
          <div className="detail-facts">
            <div>
              <CalendarDays size={19} />
              <span>
                {date(event.startsAt)} – {date(event.endsAt)} {event.endsAt.slice(0, 4)}
              </span>
            </div>
            <div>
              <MapPin size={19} />
              <span>{event.location}</span>
            </div>
            <div>
              <Trophy size={19} />
              <span>{money(event.prize)} prize pool</span>
            </div>
            <div>
              <Users size={19} />
              <span>
                1–{event.teamSize} members · {event.registrations}/{event.capacity} teams
              </span>
            </div>
          </div>
          <h3>The challenge</h3>
          <p className="detail-copy">{event.description}</p>
          <div className="deadline mono">
            REGISTRATION CLOSES {date(event.deadline).toUpperCase()}
          </div>
          {workspace.registrations.some((r) => r.eventId === event.id) ? (
            <div className="confirmed">
              <Check size={20} />
              You’re registered.
              <button
                className="text-button"
                onClick={() => {
                  close();
                  navigate('My hackathons');
                }}
              >
                View your team <ArrowRight size={16} />
              </button>
            </div>
          ) : event.ownerId === workspace.user?.id ? (
            <button className="button black" onClick={() => showTeams(event)}>
              Manage teams <ArrowUpRight size={18} />
            </button>
          ) : !open(event) ? (
            <p className="form-error">Registration is closed.</p>
          ) : workspace.user ? (
            <form
              className="form"
              onSubmit={(e) =>
                action(e, `/events/${event.id}/register`, 'Team registered. Time to build.')
              }
            >
              <label>
                Team name
                <input
                  name="teamName"
                  required
                  maxLength={80}
                  placeholder="Give your team a name"
                />
              </label>
              <label>
                Other team members{' '}
                <span className="field-note">
                  Optional · comma-separated names · up to {event.teamSize - 1} teammates
                </span>
                <input name="members" maxLength={500} placeholder="Alex, Sam" />
              </label>
              {formError && (
                <p className="form-error" role="alert">
                  {formError}
                </p>
              )}
              <button className="button black" disabled={busy}>
                {busy ? 'Registering...' : 'Register your team'}
                <ArrowUpRight size={18} />
              </button>
            </form>
          ) : (
            <button className="button black" onClick={() => show({ type: 'auth' })}>
              Log in to register <ArrowRight size={18} />
            </button>
          )}
        </article>
        <aside className="event-sidebar">
          <div className="side-card lime">
            <span className="eyebrow">THE GAME PLAN</span>
            <h3>
              Build it.
              <br />
              Then show it.
            </h3>
            <ol>
              <li>Register your crew</li>
              <li>Read the challenge</li>
              <li>Ship your project</li>
              <li>Make your pitch</li>
            </ol>
          </div>
          <div className="side-card">
            <h3>Keep this one handy.</h3>
            <button className="button" onClick={() => bookmark(event)}>
              {workspace.savedEventIds.includes(event.id) ? 'Saved ✓' : 'Save hackathon +'}
            </button>
            <button
              className="text-link"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                  setNotice('Event link copied.');
                } catch {
                  setNotice('Copy this page’s address from your browser.');
                }
              }}
            >
              Copy event link <ExternalLink size={15} />
            </button>
            <button className="text-link" onClick={() => downloadCalendar(event)}>
              Add to calendar <CalendarDays size={15} />
            </button>
          </div>
          <Link className="side-card purple sidebar-link" href="/feed?category=Team%20up">
            <Users size={28} />
            <h3>One teammate short?</h3>
            <p>Find your missing semicolon.</p>
            <span>Find a team ↗</span>
          </Link>
        </aside>
      </div>
    </section>
  );
}
function downloadCalendar(event: Hackathon) {
  const clean = (s: string) =>
    s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const end = new Date(event.endsAt + 'T00:00:00Z');
  end.setUTCDate(end.getUTCDate() + 1);
  const data = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EventForge//Hackathons//EN',
    'BEGIN:VEVENT',
    'UID:' + event.id + '@eventforge',
    'DTSTAMP:' +
      new Date()
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, ''),
    'DTSTART;VALUE=DATE:' + event.startsAt.replace(/-/g, ''),
    'DTEND;VALUE=DATE:' + end.toISOString().slice(0, 10).replace(/-/g, ''),
    'SUMMARY:' + clean(event.title),
    'DESCRIPTION:' + clean(event.description),
    'LOCATION:' + clean(event.location),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([data], { type: 'text/calendar' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = event.id + '.ics';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
