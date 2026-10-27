import Link from 'next/link';
export default function NotFound() {
  return (
    <section className="workspace">
      <div className="empty">
        <span className="eyebrow">404 / SCOPE NOT FOUND</span>
        <h1>This page didn’t make the sprint.</h1>
        <p>The good stuff is still on the radar.</p>
        <Link className="button primary" href="/hackathons">
          Explore hackathons ↗
        </Link>
      </div>
    </section>
  );
}
