'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  Code2,
  FileCode2,
  Flame,
  LayoutDashboard,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Timer,
  Users,
  Zap,
} from 'lucide-react';
import { useForge } from '@/components/forge-provider';
import { api } from '@/lib/api';
import { date, isRegistrationOpen } from '@/lib/format';
import type { FeedPost } from '@/lib/types';
export default function DashboardPage() {
  const { workspace, loading, error, show, myEvents, hosted, card } = useForge();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  useEffect(() => {
    let active = true;
    if (workspace.user)
      api<{ posts: FeedPost[] }>('/feed')
        .then((data) => {
          if (active) setPosts(data.posts.slice(0, 2));
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [workspace.user?.id]);
  if (loading)
    return (
      <div className="loading">
        <Loader2 className="spin" />
        Loading your dashboard
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
  if (!workspace.user)
    return (
      <section className="workspace">
        <div className="empty">
          <LayoutDashboard size={34} />
          <h1>Your builder dashboard.</h1>
          <p>Log in to view your events, teams, and saved opportunities.</p>
          <button className="button primary" onClick={() => show({ type: 'auth' })}>
            Log in to continue <ArrowRight size={17} />
          </button>
        </div>
      </section>
    );
  const user = workspace.user;
  const submissions = workspace.registrations.filter((r) => r.submission).length;
  const pending = workspace.registrations.filter((r) => !r.submission);
  const nextDeadline = pending
    .map((reg) => ({ reg, event: workspace.events.find((e) => e.id === reg.eventId) }))
    .filter((x) => x.event && new Date(x.event.endsAt + 'T23:59:59Z') >= new Date())
    .sort((a, b) => a.event!.endsAt.localeCompare(b.event!.endsAt))[0];
  const recommended = workspace.events
    .filter(
      (e) =>
        isRegistrationOpen(e) &&
        e.ownerId !== user.id &&
        !workspace.registrations.some((r) => r.eventId === e.id),
    )
    .slice(0, 2);
  const timeline = myEvents
    .filter((e) => new Date(e.endsAt + 'T23:59:59Z') >= new Date())
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 3);
  return (
    <div className="dashboard-page">
      <aside className="dashboard-sidebar">
        <div className="dashboard-profile">
          <div className="profile-cover" />
          <span className="profile-avatar">{user.name.charAt(0).toUpperCase()}</span>
          <h2>{user.name}</h2>
          <p>{user.phone || user.email}</p>
          <span className="profile-label">Builder</span>
        </div>
        <nav className="dashboard-side-nav" aria-label="Dashboard sections">
          <Link className="selected" href="/dashboard" aria-current="page">
            <LayoutDashboard size={17} />
            Overview
            <ArrowUpRight size={14} />
          </Link>
          <Link href="/dashboard/builds">
            <Code2 size={17} />
            My builds<span>{myEvents.length}</span>
          </Link>
          <Link href="/saved">
            <Bookmark size={17} />
            Saved events<span>{workspace.savedEventIds.length}</span>
          </Link>
          <Link href="/feed">
            <MessageSquare size={17} />
            Community feed
          </Link>
          <Link href="/toolkit">
            <Timer size={17} />
            Builder toolkit
          </Link>
          <Link href="/organize">
            <Users size={17} />
            Organize
          </Link>
        </nav>
        <div className="dashboard-sidebar-bottom">
          <span className="mono">YOUR NEXT CHAPTER</span>
          <strong>Start something.</strong>
          <Link href="/hackathons">
            Explore hackathons <ArrowUpRight size={14} />
          </Link>
        </div>
      </aside>
      <div className="dashboard-content">
        <header className="dashboard-heading">
          <div>
            <span className="eyebrow">YOUR WORKSPACE / OVERVIEW</span>
            <h1>
              Welcome back, <span>{user.name.split(' ')[0]}.</span>
            </h1>
            <p>Your builds, your next challenge, and everything in between.</p>
          </div>
          <Link className="button black" href="/hackathons">
            Explore hackathons <ArrowUpRight size={17} />
          </Link>
        </header>
        <div className="dashboard-stats">
          <Link href="/dashboard/builds">
            <span className="stat-icon lime">
              <CalendarDays size={20} />
            </span>
            <div>
              <strong>{String(myEvents.length).padStart(2, '0')}</strong>
              <span>Registered events</span>
            </div>
            <ArrowUpRight size={17} />
          </Link>
          <Link href="/dashboard/builds">
            <span className="stat-icon purple">
              <FileCode2 size={20} />
            </span>
            <div>
              <strong>{String(submissions).padStart(2, '0')}</strong>
              <span>Projects submitted</span>
            </div>
            <ArrowUpRight size={17} />
          </Link>
          <Link href="/saved">
            <span className="stat-icon orange">
              <Bookmark size={20} />
            </span>
            <div>
              <strong>{String(workspace.savedEventIds.length).padStart(2, '0')}</strong>
              <span>Saved events</span>
            </div>
            <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="dashboard-main-grid">
          <div className="dashboard-primary">
            <section className="dashboard-banner">
              <div>
                <span className="eyebrow">YOUR NEXT MOVE</span>
                <h2>
                  {nextDeadline ? 'Your next submission.' : 'Make room for your next big build.'}
                </h2>
                <p>
                  {nextDeadline
                    ? `${nextDeadline.reg.teamName} · ${nextDeadline.event!.title} · Submit by ${date(nextDeadline.event!.endsAt)}`
                    : 'Find a challenge, bring your crew, and turn an idea into something people can use.'}
                </p>
                <Link
                  className="button small"
                  href={nextDeadline ? '/dashboard/builds' : '/hackathons'}
                >
                  {nextDeadline ? 'Open my builds' : 'Find a hackathon'}
                  <ArrowRight size={15} />
                </Link>
              </div>
              <span className="dashboard-banner-art" aria-hidden="true">
                ✳
              </span>
            </section>
            <section className="dashboard-section">
              <div className="dashboard-section-head">
                <h2>
                  My builds <span>{myEvents.length}</span>
                </h2>
                <Link href="/dashboard/builds">
                  View all <ArrowUpRight size={14} />
                </Link>
              </div>
              {myEvents.length ? (
                <div className="dashboard-build-list">
                  {myEvents.slice(0, 3).map((event) => {
                    const reg = workspace.registrations.find((r) => r.eventId === event.id)!;
                    return (
                      <Link href="/dashboard/builds" key={event.id} className="dashboard-build">
                        <span className={`build-mark ${event.color}`}>
                          <Code2 size={22} />
                        </span>
                        <div>
                          <strong>{event.title}</strong>
                          <span>
                            {reg.teamName} · {date(event.startsAt)}
                          </span>
                        </div>
                        <span className={`build-status ${reg.submission ? 'submitted' : ''}`}>
                          {reg.submission ? 'Submitted' : 'Registered'}
                        </span>
                        <ArrowUpRight size={17} />
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="dashboard-empty">
                  <Code2 size={31} />
                  <div>
                    <h3>Your next project belongs here.</h3>
                    <p>Register for a hackathon to start your first build.</p>
                  </div>
                  <Link href="/hackathons" className="text-link">
                    Explore <ArrowRight size={15} />
                  </Link>
                </div>
              )}
            </section>
            <section className="dashboard-section">
              <div className="dashboard-section-head">
                <h2>Recommended for you</h2>
                <Link href="/hackathons">
                  Explore all <ArrowUpRight size={14} />
                </Link>
              </div>
              {recommended.length ? (
                <div className="event-grid dashboard-events">
                  {recommended.map((event, i) => card(event, i))}
                </div>
              ) : (
                <div className="dashboard-empty">
                  <CheckCircle2 size={28} />
                  <div>
                    <h3>You’re all caught up.</h3>
                    <p>Check Explore for the full event list.</p>
                  </div>
                  <Link href="/hackathons" className="text-link">
                    View all ↗
                  </Link>
                </div>
              )}
            </section>
            <section className="dashboard-section">
              <div className="dashboard-section-head">
                <h2>From the community</h2>
                <Link href="/feed">
                  Open feed <ArrowUpRight size={14} />
                </Link>
              </div>
              <div className="dashboard-feed">
                {posts.length ? (
                  posts.map((post) => (
                    <Link href="/feed" key={post.id}>
                      <div>
                        <span className={`feed-avatar ${post.color}`}>{post.author.charAt(0)}</span>
                        <strong>{post.author}</strong>
                        <span className="mono">{post.category}</span>
                      </div>
                      <p>{post.content.split('\n').filter(Boolean).slice(0, 2).join(' ')}</p>
                      <span className="feed-preview-footer">
                        <Flame size={14} />
                        {post.reactions}
                        <MessageSquare size={14} />
                        {post.comments.length}
                        <ArrowUpRight size={15} />
                      </span>
                    </Link>
                  ))
                ) : (
                  <div className="dashboard-empty">
                    <MessageSquare size={25} />
                    <p>Share your progress and meet other builders.</p>
                    <Link href="/feed" className="text-link">
                      Open feed ↗
                    </Link>
                  </div>
                )}
              </div>
            </section>
          </div>
          <aside className="dashboard-right">
            <section className="dashboard-panel">
              <div className="dashboard-section-head">
                <h2>Quick access</h2>
                <Zap size={18} />
              </div>
              <Link href="/hackathons">
                <span className="lime">
                  <Search size={18} />
                </span>
                Find a hackathon
                <ArrowUpRight size={15} />
              </Link>
              <Link href="/feed?category=Team%20up">
                <span className="purple">
                  <Users size={18} />
                </span>
                Find a teammate
                <ArrowUpRight size={15} />
              </Link>
              <Link href="/toolkit">
                <span className="orange">
                  <Timer size={18} />
                </span>
                Start a focus session
                <ArrowUpRight size={15} />
              </Link>
              <button onClick={() => show({ type: 'create' })}>
                <span className="pink">
                  <Plus size={18} />
                </span>
                Host a hackathon
                <ArrowUpRight size={15} />
              </button>
            </section>
            <section className="dashboard-panel">
              <div className="dashboard-section-head">
                <h2>On your calendar</h2>
                <CalendarDays size={17} />
              </div>
              {timeline.length ? (
                timeline.map((e) => (
                  <Link href={`/hackathons/${e.id}`} key={e.id} className="calendar-entry">
                    <span className={`calendar-date ${e.color}`}>
                      {new Date(e.startsAt + 'T12:00:00').getDate()}
                      <small>
                        {new Date(e.startsAt + 'T12:00:00').toLocaleDateString('en-IN', {
                          month: 'short',
                        })}
                      </small>
                    </span>
                    <div>
                      <strong>{e.title}</strong>
                      <small>{e.mode}</small>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="calendar-empty">
                  <span className="calendar-illustration">↗</span>
                  <p>No registered events yet.</p>
                  <Link className="text-link" href="/hackathons">
                    Find your first one <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </section>
            <section className="dashboard-organizer purple">
              <span className="eyebrow">BUILD THE STAGE.</span>
              <h2>
                Got a challenge
                <br />
                worth sharing?
              </h2>
              <p>
                {hosted.length
                  ? `${hosted.length} hackathon${hosted.length === 1 ? '' : 's'} in your organizer workspace.`
                  : 'Bring your campus together with a hackathon of your own.'}
              </p>
              <Link className="button small" href="/organize">
                Organizer workspace
                <ArrowUpRight size={15} />
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
