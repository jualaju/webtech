'use client';
import { useForge } from '@/components/forge-provider';
import {
  ArrowUpRight,
  Code2,
  LayoutGrid,
  Loader2,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
export default function ExplorePage() {
  const {
    workspace,
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
    loading,
    error,
    setLoading,
    refresh,
    pending,
    show,
    events,
    tracked,
    card,
  } = useForge();
  return (
    <>
      {' '}
      <section className="explore-section" id="explore">
        <div className="section-heading">
          <div>
            <div className="eyebrow">YOUR NEXT CHALLENGE</div>
            <h1>
              On the radar<span>↘</span>
            </h1>
          </div>
          <p>Good problems. Better possibilities.</p>
        </div>
        <div className="explorer">
          <aside className="filters">
            <div className="filter-title">
              <SlidersHorizontal size={17} />
              <strong>Filters</strong>
              <button
                onClick={() => {
                  setTrack('All tracks');
                  setFormat('All formats');
                  setOnlyOpen(false);
                  setQuery('');
                }}
              >
                Reset
              </button>
            </div>
            <fieldset>
              <legend>TRACK</legend>
              {['All tracks', ...tracked].map((t) => (
                <label className="radio-label" key={t}>
                  <input
                    type="radio"
                    name="track"
                    checked={track === t}
                    onChange={() => setTrack(t)}
                  />
                  <span>{t}</span>
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend>FORMAT</legend>
              {['All formats', 'Online', 'In person', 'Hybrid'].map((t) => (
                <label className="radio-label" key={t}>
                  <input
                    type="radio"
                    name="format"
                    checked={format === t}
                    onChange={() => setFormat(t)}
                  />
                  <span>{t}</span>
                </label>
              ))}
            </fieldset>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={onlyOpen}
                onChange={(e) => setOnlyOpen(e.target.checked)}
              />
              Open for registration
            </label>
            <div className="filter-note">
              <Code2 size={24} />
              <strong>Got a challenge?</strong>
              <p>Make it a hackathon.</p>
              <button
                onClick={() => {
                  if (!workspace.user) pending.current = { type: 'create' };
                  show(workspace.user ? { type: 'create' } : { type: 'auth' });
                }}
              >
                Host an event <ArrowUpRight size={15} />
              </button>
            </div>
          </aside>
          <div className="results">
            <div className="search-row">
              <label className="search">
                <Search size={20} />
                <input
                  aria-label="Search hackathons"
                  placeholder="Search hackathons, cities, organizers..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button aria-label="Clear search" onClick={() => setQuery('')}>
                    <X size={16} />
                  </button>
                )}
                <kbd>/</kbd>
              </label>
              <label className="sort">
                <span className="sr-only">Sort hackathons</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option>Upcoming</option>
                  <option>Closing soon</option>
                  <option>Prize pool</option>
                </select>
              </label>
            </div>
            <div className="results-meta">
              <span>
                {loading
                  ? 'Finding hackathons...'
                  : `${events.length} hackathon${events.length === 1 ? '' : 's'}`}
              </span>
              <span>
                <LayoutGrid size={14} /> THE BUILD LIST
              </span>
            </div>
            {error ? (
              <div className="empty error" role="alert">
                <h3>Couldn’t load hackathons.</h3>
                <p>{error}</p>
                <button
                  className="button"
                  onClick={() => {
                    setLoading(true);
                    refresh();
                  }}
                >
                  Try again
                </button>
              </div>
            ) : loading ? (
              <div className="loading">
                <Loader2 className="spin" />
                Loading hackathons
              </div>
            ) : events.length ? (
              <div className="event-grid">{events.map((e, i) => card(e, i))}</div>
            ) : (
              <div className="empty">
                <Search />
                <h3>No matches. New search?</h3>
                <p>Try another track, format, or keyword.</p>
                <button
                  className="button"
                  onClick={() => {
                    setQuery('');
                    setTrack('All tracks');
                    setFormat('All formats');
                    setOnlyOpen(false);
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
