'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Bell, CalendarDays, Check, ChevronRight, Clock3, Code2, FileCheck2, LayoutDashboard, LogOut, Menu, Moon, Plus, Search, Sparkles, Sun, Trophy, Users, X } from 'lucide-react';

type EventItem = { title: string; date: string; place: string; description: string; teams: number; status: string; art: string; icon: 'code' | 'users' | 'trophy' | 'spark' };

const events: EventItem[] = [
  { title: 'Build for Tomorrow', date: 'Oct 18–20, 2026', place: 'Innovation Lab · Main Campus', description: 'A 48-hour build sprint for ideas that make campus life better.', teams: 24, status: 'registration open', art: 'art-a', icon: 'code' },
  { title: 'Designing for Impact', date: 'Oct 26, 2026', place: 'Design Studio · Block C', description: 'Turn a real community challenge into a thoughtful product.', teams: 12, status: 'coming soon', art: 'art-b', icon: 'spark' },
  { title: 'AI for Good Challenge', date: 'Nov 04–06, 2026', place: 'Auditorium + Online', description: 'Prototype responsible AI solutions with mentors from industry.', teams: 31, status: 'registration open', art: 'art-c', icon: 'trophy' },
];

const iconFor = (name: EventItem['icon']) => name === 'code' ? <Code2 size={29} /> : name === 'users' ? <Users size={29} /> : name === 'trophy' ? <Trophy size={29} /> : <Sparkles size={29} />;

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authError, setAuthError] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [userName, setUserName] = useState('Jual Aju');
  const [active, setActive] = useState('Overview');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(false);
  const [registered, setRegistered] = useState<string[]>([]);
  const [menu, setMenu] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const visible = events.filter((event) => `${event.title} ${event.place} ${event.description}`.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    setAuthenticated(localStorage.getItem('eventforge-session') === 'active');
    setDarkMode(localStorage.getItem('eventforge-theme') === 'dark');
    setUserName(localStorage.getItem('eventforge-name') || 'Jual Aju');
    setNow(new Date());
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    localStorage.setItem('eventforge-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  function register(title: string) { setRegistered((current) => current.includes(title) ? current : [...current, title]); }

  function handleAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') || '').trim();
    const password = String(data.get('password') || '');
    const name = String(data.get('name') || '').trim();
    if (!email || !email.includes('@') || password.length < 6) {
      setAuthError('Use a valid email and a password with at least 6 characters.');
      return;
    }
    localStorage.setItem('eventforge-session', 'active');
    localStorage.setItem('eventforge-email', email);
    localStorage.setItem('eventforge-name', name || email.split('@')[0]);
    setUserName(name || email.split('@')[0]);
    setAuthenticated(true);
    setAuthError('');
  }

  function signOut() {
    localStorage.removeItem('eventforge-session');
    setAuthenticated(false);
    setAuthMode('signin');
  }

  const greeting = now ? (now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening') : 'Welcome back';
  const firstName = userName.trim().split(/\s+/)[0] || 'there';
  const dateLabel = now ? new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(now) : 'Your event workspace';

  const eventCard = (event: EventItem) => <article className="event-card" key={event.title}><div className={`event-art ${event.art}`}><span className="tag">{event.status}</span>{iconFor(event.icon)}</div><div className="event-body"><div className="event-date"><CalendarDays size={14} />{event.date}</div><h3>{event.title}</h3><p>{event.description}</p><div className="event-foot"><span><Users size={14} />{event.teams} teams joined</span><button className="link" onClick={() => register(event.title)}>{registered.includes(event.title) ? 'Registered' : 'Join event'} <ChevronRight size={14} /></button></div></div></article>;

  const updatesPanel = <section className="panel updates-panel"><div className="panel-title"><Bell size={18} /><h3>Latest updates</h3></div><div className="feed-row"><span className="feed-dot" /><div><strong>Build for Tomorrow · Registration is open</strong><p>Team formation closes on October 16. Bring a team or join one at the venue.</p><time>2 hours ago</time></div></div><div className="feed-row"><span className="feed-dot" /><div><strong>Certificates are ready to verify</strong><p>Certificates from Campus Code Jam are now available in your workspace.</p><time>Yesterday</time></div></div><div className="feed-row"><span className="feed-dot" /><div><strong>New challenge track added</strong><p>AI for Good now includes a responsible innovation track.</p><time>3 days ago</time></div></div></section>;

  if (!authenticated) return <main className="auth-page"><div className="auth-brand"><span className="brand-mark"><Check size={20} strokeWidth={3} /></span>Event<em>Forge</em></div><div className="auth-card"><div className="kicker">Your event workspace</div><h1>{authMode === 'signin' ? 'Welcome back.' : 'Make ideas happen.'}</h1><p>{authMode === 'signin' ? 'Sign in to continue to your events, teams, and projects.' : 'Create your free workspace and start building what matters.'}</p><div className="auth-tabs"><button className={authMode === 'signin' ? 'selected' : ''} onClick={() => { setAuthMode('signin'); setAuthError(''); }}>Sign in</button><button className={authMode === 'signup' ? 'selected' : ''} onClick={() => { setAuthMode('signup'); setAuthError(''); }}>Sign up</button></div><form className="form auth-form" onSubmit={handleAuth}>{authMode === 'signup' && <label>Your name<input name="name" required placeholder="e.g. Jual Aju" /></label>}<label>Email address<input name="email" type="email" required placeholder="you@example.com" /></label><label>Password<input name="password" type="password" required minLength={6} placeholder="At least 6 characters" /></label>{authError && <p className="form-error">{authError}</p>}<button className="primary auth-submit" type="submit">{authMode === 'signin' ? 'Sign in' : 'Create account'} <ArrowRight size={16} /></button></form><small className="auth-note">Demo mode: any valid email and 6+ character password works.</small></div><button className="theme-toggle auth-theme" onClick={() => setDarkMode(!darkMode)}>{darkMode ? <Sun size={16} /> : <Moon size={16} />}{darkMode ? 'Light mode' : 'Dark mode'}</button></main>;

  return <div className="shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => setActive('Overview')}><span className="brand-mark"><Check size={20} strokeWidth={3} /></span>Event<em>Forge</em></button>
      <div className="sidebar-section-label">Your workspace</div>
      <nav className="nav">
        {[[LayoutDashboard, 'Overview'], [Search, 'Discover events'], [CalendarDays, 'My events'], [FileCheck2, 'Certificates']].map(([Icon, label]) => <button key={label as string} className={active === label ? 'active' : ''} onClick={() => setActive(label as string)}><Icon size={18} />{label as string}{label === 'My events' && <span>{registered.length}</span>}</button>)}
      </nav>
      <div className="spacer" />
      <div className="sidebar-note"><Sparkles size={21} /><strong>Make ideas happen.</strong><p>One calm place for the people, projects, and moments that matter.</p><button className="sidebar-note-link" onClick={() => setActive('Discover events')}>Explore events <ArrowRight size={14} /></button></div>
      <div className="user-card"><span className="avatar">{userName.charAt(0).toUpperCase()}</span><div><strong>{userName}</strong><small>Participant · Demo account</small></div><button aria-label="Sign out" onClick={signOut}><LogOut size={17} /></button></div>
    </aside>
    <main className="main">
      <header className="topbar"><button className="icon-btn mobile-only" aria-label="Open navigation" onClick={() => setMenu(!menu)}><Menu size={22} /></button><div className="crumb"><span>Workspace <ChevronRight size={14} /></span><strong>{active}</strong></div><div className="top-actions"><button className="icon-btn" aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setDarkMode(!darkMode)}>{darkMode ? <Sun size={19} /> : <Moon size={19} />}</button><button className="icon-btn notification-button" aria-label="Notifications" onClick={() => setNotificationsOpen(!notificationsOpen)}><Bell size={19} /><span className="notification-dot" /></button><button className="secondary" onClick={() => setModal(true)}><Plus size={16} /> Host an event</button></div></header>
      {notificationsOpen && <div className="notification-popover panel">{updatesPanel}</div>}
      {menu && <div className="mobile-menu panel"><div className="kicker">Workspace</div>{['Overview', 'Discover events', 'My events', 'Certificates'].map(item => <button className="link" key={item} onClick={() => { setActive(item); setMenu(false); }}>{item}</button>)}</div>}
      <section className="workspace">
        <div className="intro"><div><div className="kicker">{dateLabel}</div><h1>{greeting},<br /><em>{firstName}.</em></h1><p>Pick up where you left off, or find the next event worth showing up for.</p></div><div className="pulse"><div className="pulse-orb" /><small>YOUR EVENT PULSE</small><strong>{registered.length ? `${registered.length} event${registered.length > 1 ? 's' : ''} on your calendar` : 'Your calendar is wide open'}</strong><span>{registered.length ? 'Registration confirmed. See you there.' : 'There is plenty of room for a good idea.'}</span></div></div>
        {active === 'Overview' && <><div className="metrics"><div className="metric"><div className="metric-top">Active events <CalendarDays size={17} /></div><strong>08</strong><small>+2 this week</small></div><div className="metric"><div className="metric-top">Registered teams <Users size={17} /></div><strong>126</strong><small>Across all events</small></div><div className="metric"><div className="metric-top">Projects submitted <FileCheck2 size={17} /></div><strong>64</strong><small>Ready for review</small></div><div className="metric"><div className="metric-top">Upcoming deadline <Clock3 size={17} /></div><strong>06d</strong><small>Build for Tomorrow</small></div></div><div className="section-head"><div><h2>Find your next build</h2><p>Events open for registration and collaboration.</p></div><button className="link" onClick={() => setActive('Discover events')}>View all events <ArrowRight size={14} /></button></div><div className="event-grid">{visible.map(eventCard)}</div><div className="lower-grid">{updatesPanel}<section className="panel"><div className="panel-title"><Trophy size={18} /><h3>Leaderboard · Campus Code Jam</h3></div>{[['01', 'Null Pointers', '92.4'], ['02', 'The Build Crew', '89.7'], ['03', 'Ctrl Alt Elite', '86.2']].map(([rank, name, score]) => <div className="rank-row" key={name}><span className="rank">{rank}</span><div><strong>{name}</strong><small>Team project</small></div><span className="score">{score}</span></div>)}</section></div></>}
        {active === 'Discover events' && <><div className="section-head"><div><h2>Discover events</h2><p>Search upcoming events and join your next team.</p></div></div><label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by event, location, or description" /></label><div className="event-grid">{visible.length ? visible.map(eventCard) : <div className="panel empty-state"><Search size={24} /><h3>No events found</h3><p>Try a different search term.</p></div>}</div></>}
        {active === 'My events' && <><div className="section-head"><div><h2>My events</h2><p>Events you have registered for.</p></div></div>{registered.length ? <div className="event-grid">{events.filter((event) => registered.includes(event.title)).map(eventCard)}</div> : <div className="panel empty-state"><CalendarDays size={24} /><h3>Your calendar is empty</h3><p>Explore events and join one to see it here.</p><button className="primary" onClick={() => setActive('Discover events')}>Discover events <ArrowRight size={16} /></button></div>}</>}
        {active === 'Certificates' && <><div className="section-head"><div><h2>Certificates</h2><p>View and verify your event achievements.</p></div></div><section className="panel certificate-card"><div className="certificate-icon"><Trophy size={25} /></div><div><h3>Campus Code Jam 2026</h3><p>Participation certificate · Ready to verify</p></div><button className="secondary" onClick={() => window.alert('Certificate verification is ready to launch.')}>Verify certificate <ArrowRight size={15} /></button></section></>}
      </section>
    </main>
    {modal && <div className="modal-bg" role="dialog" aria-modal="true"><div className="modal"><button className="close" aria-label="Close" onClick={() => setModal(false)}><X size={19} /></button><div className="kicker">Organizer workspace</div><h2>Create an event</h2><p>Set up the basics now. You can add challenges, schedules, and judges after publishing.</p><form className="form" onSubmit={(event) => { event.preventDefault(); setModal(false); }}><label>Event name<input required placeholder="e.g. Campus Innovation Sprint" /></label><label>Location<input required placeholder="Main campus · Innovation Lab" /></label><label>About the event<textarea required rows={3} placeholder="What should participants know?" /></label><button className="primary" type="submit">Create draft <ArrowRight size={16} /></button></form></div></div>}
  </div>;
}
