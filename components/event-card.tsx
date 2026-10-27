'use client';
import Link from 'next/link';
import {
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  Code2,
  Command,
  Globe2,
  MapPin,
  Trophy,
  Users,
} from 'lucide-react';
import type { Hackathon, Registration } from '@/lib/types';
import { money, date, isRegistrationOpen as open } from '@/lib/format';
export function EventCard({
  event,
  index,
  registration: reg,
  personal = false,
  saved = false,
  onBookmark,
  onView,
  onSubmit,
}: {
  saved?: boolean;
  onBookmark?: () => void;
  event: Hackathon;
  index: number;
  registration?: Registration;
  personal?: boolean;
  onView: (event: Hackathon) => void;
  onSubmit: (event: Hackathon, registration: Registration) => void;
}) {
  return (
    <article className="event-card" key={event.id}>
      <Link
        className={`poster ${event.color}`}
        href={`/hackathons/${event.id}`}
        aria-label={`View ${event.title}`}
      >
        <div className="poster-top">
          <span className="mono">{event.track}</span>
          <ArrowUpRight size={22} />
        </div>
        <div className="poster-title">{event.title}</div>
        <div className="poster-graphic" aria-hidden="true">
          {event.color === 'lime' ? (
            <Command />
          ) : event.color === 'purple' ? (
            <span className="asterisk">✳</span>
          ) : event.color === 'orange' ? (
            <Code2 />
          ) : (
            <Globe2 />
          )}
        </div>
        <div className="poster-bottom">
          <span className="mono">{event.mode}</span>
          <span className="mono">/{String(index + 1).padStart(2, '0')}</span>
        </div>
      </Link>
      <div className="card-content">
        <div className="card-meta">
          <button
            className={`bookmark-button ${saved ? 'saved' : ''}`}
            aria-label={`${saved ? 'Unsave' : 'Save'} ${event.title}`}
            aria-pressed={saved}
            onClick={onBookmark}
          >
            <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
          </button>
          <span className={`status ${open(event) ? 'is-open' : ''}`}>
            <i />
            {reg ? 'Registered' : open(event) ? 'Registration open' : 'Registration closed'}
          </span>
        </div>
        <Link className="title-button" href={`/hackathons/${event.id}`}>
          <h3>{event.title}</h3>
          <ArrowUpRight size={20} />
        </Link>
        <p className="organizer">{event.organizer}</p>
        <div className="event-facts">
          <span>
            <CalendarDays size={15} />
            {date(event.startsAt)} – {date(event.endsAt)}
          </span>
          <span>
            <MapPin size={15} />
            {event.mode === 'Online'
              ? 'Online'
              : event.location.split(',')[1]?.trim() || event.location}
          </span>
        </div>
        <div className="card-bottom">
          <div>
            <Trophy size={17} />
            <strong>{money(event.prize)}</strong>
            <span>in prizes</span>
          </div>
          <span>
            <Users size={15} />
            {event.registrations}/{event.capacity} teams
          </span>
        </div>
        {personal && reg && (
          <div className="personal-actions">
            <span className="mono">{reg.teamName}</span>
            <button className="button small" onClick={() => onSubmit(event, reg)}>
              {reg.submission ? 'Edit submission' : 'Submit project'}
              <ArrowUpRight size={15} />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
