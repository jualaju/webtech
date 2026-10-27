'use client';
import { PhoneAuth } from '@/components/phone-auth';
import { Dialog } from '@/components/dialog';
import { EventCard } from '@/components/event-card';
import { api } from '@/lib/api';
import { isRegistrationOpen as open } from '@/lib/format';
import type { Hackathon, Registration, Workspace } from '@/lib/types';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ExternalLink,
  Loader2,
  LogOut,
  Menu,
  Plus,
  Users,
  X,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
type Modal =
  | { type: 'auth' }
  | { type: 'create' }
  | { type: 'event'; event: Hackathon }
  | { type: 'submit'; event: Hackathon; registration: Registration }
  | { type: 'teams'; event: Hackathon }
  | null;

function useForgeState() {
  const [workspace, setWorkspace] = useState<Workspace>({
    user: null,
    events: [],
    registrations: [],
    savedEventIds: [],
    demoAuthEnabled: false,
  });
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const router = useRouter();
  const pathname = usePathname();
  const view = pathname.startsWith('/organize')
    ? 'Organize'
    : pathname.startsWith('/dashboard')
      ? 'My hackathons'
      : 'Explore';
  const [query, setQuery] = useState(''),
    [track, setTrack] = useState('All tracks'),
    [format, setFormat] = useState('All formats'),
    [sort, setSort] = useState('Upcoming'),
    [onlyOpen, setOnlyOpen] = useState(false);
  const [modal, setModal] = useState<Modal>(null),
    [authMode, setAuthMode] = useState('signup'),
    [busy, setBusy] = useState(false),
    [formError, setFormError] = useState(''),
    [mobile, setMobile] = useState(false),
    [teams, setTeams] = useState<Registration[]>([]);
  const pending = useRef<Modal>(null);
  const initialLink = useRef(false);
  const close = useCallback(() => {
    setModal(null);
    pending.current = null;
    setFormError('');
  }, []);
  const refresh = useCallback(async () => {
    try {
      const data = await api<Workspace>('/workspace');
      setWorkspace({ ...data, savedEventIds: data.savedEventIds || [] });
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    if (!loading && !initialLink.current) {
      initialLink.current = true;
      const id = new URLSearchParams(window.location.search).get('event');
      const event = workspace.events.find((e) => e.id === id);
      if (event) router.replace('/hackathons/' + encodeURIComponent(event.id));
    }
  }, [loading, workspace.events]);
  useEffect(() => {
    function shortcut(e: KeyboardEvent) {
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName) &&
        !modal
      ) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('[aria-label="Search hackathons"]')?.focus();
      }
    }
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, [modal]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  function show(next: Modal) {
    setFormError('');
    if (next?.type === 'auth') pending.current = modal?.type === 'event' ? modal : pending.current;
    if (next?.type === 'event') {
      router.push('/hackathons/' + encodeURIComponent(next.event.id));
      return;
    }
    setModal(next);
  }
  function navigate(next: string) {
    router.push(
      next === 'Organize'
        ? '/organize'
        : next === 'My hackathons'
          ? '/dashboard/builds'
          : '/hackathons',
    );
    setMobile(false);
  }
  async function action(e: FormEvent<HTMLFormElement>, path: string, success: string) {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    const body = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api(path, body);
      await refresh();
      close();
      if (path.startsWith('/auth/')) router.push('/dashboard');
      setNotice(success);
      if (path === '/events') router.push('/organize');
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function signout() {
    try {
      await api('/auth/signout', {});
      await refresh();
      router.push('/');
      setNotice('Signed out.');
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  async function showTeams(event: Hackathon) {
    show({ type: 'teams', event });
    setTeams([]);
    setBusy(true);
    try {
      setTeams(
        (await api<{ registrations: Registration[] }>(`/events/${event.id}/participants`))
          .registrations,
      );
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const events = workspace.events
    .filter(
      (e) =>
        `${e.title} ${e.organizer} ${e.location}`.toLowerCase().includes(query.toLowerCase()) &&
        (track === 'All tracks' || e.track === track) &&
        (format === 'All formats' || e.mode === format) &&
        (!onlyOpen || open(e)),
    )
    .sort((a, b) =>
      sort === 'Prize pool'
        ? b.prize - a.prize
        : sort === 'Closing soon'
          ? a.deadline.localeCompare(b.deadline)
          : a.startsAt.localeCompare(b.startsAt),
    );
  const myEvents = workspace.events.filter((e) =>
    workspace.registrations.some((r) => r.eventId === e.id),
  );
  const hosted = workspace.events.filter((e) => e.ownerId === workspace.user?.id);
  const tracked = [...new Set(workspace.events.map((e) => e.track))];
  const card = (event: Hackathon, index: number, personal = false) => (
    <EventCard
      key={event.id}
      event={event}
      index={index}
      registration={workspace.registrations.find((r) => r.eventId === event.id)}
      personal={personal}
      saved={workspace.savedEventIds.includes(event.id)}
      onBookmark={() => bookmark(event)}
      onView={(event) => show({ type: 'event', event })}
      onSubmit={(event, registration) => show({ type: 'submit', event, registration })}
    />
  );
  async function bookmark(event: Hackathon) {
    if (!workspace.user) {
      show({ type: 'auth' });
      return;
    }
    try {
      await api(`/events/${event.id}/bookmark`, {
        saved: !workspace.savedEventIds.includes(event.id),
      });
      await refresh();
    } catch (e) {
      setNotice((e as Error).message);
    }
  }

  return {
    workspace,
    loading,
    setLoading,
    error,
    notice,
    setNotice,
    query,
    setQuery,
    track,
    setTrack,
    format,
    setFormat,
    sort,
    setSort,
    onlyOpen,
    setOnlyOpen,
    modal,
    setModal,
    authMode,
    setAuthMode,
    busy,
    setBusy,
    formError,
    setFormError,
    mobile,
    setMobile,
    pending,
    close,
    refresh,
    show,
    navigate,
    action,
    signout,
    showTeams,
    events,
    myEvents,
    hosted,
    tracked,
    card,
    view,
    pathname,
    bookmark,
    teams,
  };
}
const ForgeContext = createContext<ReturnType<typeof useForgeState> | null>(null);
export function useForge() {
  const value = useContext(ForgeContext);
  if (!value) throw new Error('ForgeProvider missing');
  return value;
}
export function ForgeProvider({ children }: { children: ReactNode }) {
  const value = useForgeState();
  return (
    <ForgeContext.Provider value={value}>
      {children}
      <ForgeDialogs />
    </ForgeContext.Provider>
  );
}
export function SiteHeader() {
  const { workspace, loading, pathname, mobile, setMobile, signout, show, pending } = useForge();
  return (
    <header className="site-header">
      <Link
        className="brand"
        href={workspace.user ? '/dashboard' : '/'}
        aria-label="EventForge home"
      >
        <span className="brand-icon">
          <Zap size={23} fill="currentColor" />
        </span>
        EventForge<span className="brand-dot">®</span>
      </Link>
      <nav className={mobile ? 'main-nav expanded' : 'main-nav'} aria-label="Main navigation">
        {[
          ['/hackathons', 'Explore'],
          ['/feed', 'The feed'],
          ['/dashboard', 'Dashboard'],
          ['/organize', 'Organize'],
        ].map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className={pathname.startsWith(href) ? 'active' : ''}
            aria-current={pathname.startsWith(href) ? 'page' : undefined}
            onClick={() => setMobile(false)}
          >
            {label}
            {pathname.startsWith(href) && <span />}
          </Link>
        ))}
        <Link href="/saved" className="mobile-nav-extra">
          Saved
        </Link>
        <Link href="/toolkit" className="mobile-nav-extra">
          Toolkit
        </Link>
      </nav>
      <div className="header-actions">
        {workspace.user ? (
          <>
            <button
              className="account-switch"
              aria-label="Switch account"
              onClick={() => show({ type: 'auth' })}
            >
              <span className="account-avatar">{workspace.user.name.charAt(0)}</span>
              <span>
                {workspace.user.name.split(' ')[0]}
                <small>Switch account ↗</small>
              </span>
            </button>
            <button className="icon-button" aria-label="Sign out" onClick={signout}>
              <LogOut size={19} />
            </button>
          </>
        ) : (
          <button
            className="button small"
            disabled={loading}
            onClick={() => {
              show({ type: 'auth' });
            }}
          >
            Log in <ArrowUpRight size={16} />
          </button>
        )}
        <button
          className="button primary host-button small"
          disabled={loading}
          onClick={() => {
            if (!workspace.user) pending.current = { type: 'create' };
            show(workspace.user ? { type: 'create' } : { type: 'auth' });
          }}
        >
          Host a hackathon <Plus size={17} />
        </button>
        <button
          className="icon-button mobile-toggle"
          aria-label="Toggle navigation"
          onClick={() => setMobile(!mobile)}
        >
          <Menu />
        </button>
      </div>
    </header>
  );
}
export function SiteFooter() {
  return (
    <footer>
      <Link className="brand" href="/">
        <span className="brand-icon">
          <Zap size={19} fill="currentColor" />
        </span>
        EventForge
      </Link>
      <nav aria-label="Footer navigation">
        <Link href="/feed">The feed</Link>
        <Link href="/saved">Saved</Link>
        <Link href="/toolkit">Builder toolkit ↗</Link>
      </nav>
      <span className="mono">© {new Date().getFullYear()} EVENTFORGE</span>
    </footer>
  );
}
function ForgeDialogs() {
  const {
    modal,
    close,
    notice,
    setNotice,
    authMode,
    setAuthMode,
    formError,
    setFormError,
    action,
    busy,
    teams,
    setBusy,
    workspace,
    show,
    showTeams,
    navigate,
  } = useForge();
  return (
    <>
      {' '}
      {notice && (
        <div className="toast" role="status">
          <Check size={19} />
          {notice}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setNotice('')}
          >
            <X size={17} />
          </button>
        </div>
      )}{' '}
      {modal && (
        <Dialog
          title={
            modal.type === 'auth'
              ? 'YOUR ACCOUNT'
              : modal.type === 'create'
                ? 'HOST A HACKATHON'
                : modal.type === 'submit'
                  ? 'PROJECT SUBMISSION'
                  : modal.type === 'teams'
                    ? 'REGISTERED TEAMS'
                    : 'THE BRIEF'
          }
          close={close}
        >
          {modal.type === 'auth' && <PhoneAuth />}
          {modal.type === 'create' && (
            <>
              <h2>Set the challenge.</h2>
              <form
                className="form"
                onSubmit={(e) =>
                  action(e, '/events', 'Hackathon published. Let the building begin.')
                }
              >
                <div className="form-grid">
                  <label>
                    Hackathon name
                    <input name="title" required maxLength={80} placeholder="The next big build" />
                  </label>
                  <label>
                    Organizer
                    <input
                      name="organizer"
                      required
                      maxLength={80}
                      placeholder="Your club or college"
                    />
                  </label>
                </div>
                <label>
                  The brief
                  <textarea
                    name="description"
                    required
                    minLength={20}
                    maxLength={3000}
                    rows={3}
                    placeholder="The challenge, rules, and what teams should build."
                  />
                </label>
                <div className="form-grid">
                  <label>
                    Track
                    <select name="track">
                      {[
                        'Open innovation',
                        'AI & ML',
                        'Web development',
                        'Sustainability',
                        'Fintech',
                        'Design',
                      ].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Format
                    <select name="mode">
                      <option>In person</option>
                      <option>Online</option>
                      <option>Hybrid</option>
                    </select>
                  </label>
                </div>
                <label>
                  Location
                  <input
                    name="location"
                    required
                    maxLength={150}
                    placeholder="Venue, city or Online"
                  />
                </label>
                <div className="form-grid three">
                  <label>
                    Starts
                    <input
                      name="startsAt"
                      type="date"
                      min={new Date().toISOString().slice(0, 10)}
                      required
                    />
                  </label>
                  <label>
                    Ends
                    <input
                      name="endsAt"
                      type="date"
                      min={new Date().toISOString().slice(0, 10)}
                      required
                    />
                  </label>
                  <label>
                    Registration closes
                    <input
                      name="deadline"
                      type="date"
                      min={new Date().toISOString().slice(0, 10)}
                      required
                    />
                  </label>
                </div>
                <div className="form-grid three">
                  <label>
                    Prize pool (₹)
                    <input
                      name="prize"
                      type="number"
                      min={0}
                      max={10000000}
                      defaultValue={0}
                      required
                    />
                  </label>
                  <label>
                    Max team size
                    <input
                      name="teamSize"
                      type="number"
                      min={1}
                      max={6}
                      defaultValue={4}
                      required
                    />
                  </label>
                  <label>
                    Team capacity
                    <input
                      name="capacity"
                      type="number"
                      min={1}
                      max={1000}
                      defaultValue={50}
                      required
                    />
                  </label>
                </div>
                {formError && (
                  <p className="form-error" role="alert">
                    {formError}
                  </p>
                )}
                <button className="button black" disabled={busy}>
                  {busy ? 'Publishing...' : 'Publish hackathon'}
                  <ArrowUpRight size={18} />
                </button>
              </form>
            </>
          )}
          {modal.type === 'submit' && (
            <>
              <h2>Show what you built.</h2>
              <p className="subtitle">
                {modal.event.title} / {modal.registration.teamName}
              </p>
              <form
                className="form"
                onSubmit={(e) =>
                  action(
                    e,
                    `/events/${modal.event.id}/submission`,
                    'Project submitted. Nicely shipped.',
                  )
                }
              >
                <label>
                  Project title
                  <input
                    name="title"
                    required
                    maxLength={100}
                    defaultValue={modal.registration.submission?.title}
                  />
                </label>
                <label>
                  What does it do?
                  <textarea
                    name="description"
                    required
                    rows={4}
                    minLength={20}
                    maxLength={3000}
                    defaultValue={modal.registration.submission?.description}
                  />
                </label>
                <label>
                  Repository URL
                  <input
                    name="repository"
                    type="url"
                    required
                    defaultValue={modal.registration.submission?.repository}
                    placeholder="https://github.com/you/project"
                  />
                </label>
                <label>
                  Demo URL <span className="field-note">Optional</span>
                  <input
                    name="demo"
                    type="url"
                    defaultValue={modal.registration.submission?.demo}
                    placeholder="https://your-project.vercel.app"
                  />
                </label>
                {formError && (
                  <p className="form-error" role="alert">
                    {formError}
                  </p>
                )}
                <button className="button black" disabled={busy}>
                  {busy ? 'Submitting...' : 'Submit project'}
                  <ArrowUpRight size={18} />
                </button>
              </form>
            </>
          )}
          {modal.type === 'teams' && (
            <>
              <h2>{modal.event.title}</h2>
              <p className="subtitle">{teams.length} registered teams</p>
              {busy ? (
                <div className="loading">
                  <Loader2 className="spin" />
                  Loading teams
                </div>
              ) : formError ? (
                <p className="form-error">{formError}</p>
              ) : teams.length ? (
                <div className="teams-list">
                  {teams.map((r, i) => (
                    <article key={r.id}>
                      <div className="team-heading">
                        <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                        <h3>{r.teamName}</h3>
                        <span className="tag">{r.submission ? 'Submitted' : 'Building'}</span>
                      </div>
                      <p>{r.members ? `Teammates: ${r.members}` : 'Solo team'}</p>
                      {r.submission && (
                        <div className="submission">
                          <strong>{r.submission.title}</strong>
                          <p>{r.submission.description}</p>
                          <a
                            href={r.submission.repository}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Repository <ExternalLink size={14} />
                          </a>
                          {r.submission.demo && (
                            <a href={r.submission.demo} target="_blank" rel="noopener noreferrer">
                              Demo <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty">
                  <Users />
                  <h3>No teams yet.</h3>
                  <p>Share your hackathon with your campus.</p>
                  <button
                    className="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          window.location.origin +
                            '/hackathons/' +
                            encodeURIComponent(modal.event.id),
                        );
                        setNotice('Event link copied.');
                      } catch {
                        setFormError(
                          'Clipboard unavailable. Copy the site address from your browser.',
                        );
                      }
                    }}
                  >
                    Copy event link
                  </button>
                </div>
              )}
            </>
          )}
        </Dialog>
      )}
    </>
  );
}
