'use client';
import { useForge } from '@/components/forge-provider';
import { api } from '@/lib/api';
import type { FeedPost } from '@/lib/types';
import {
  ArrowUpRight,
  Code2,
  Flame,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
const categories = ['All posts', 'Build log', 'Team up', 'Shitpost', 'Question'];
export default function FeedPage() {
  const { workspace, loading: sessionLoading, show, setNotice } = useForge();
  const [posts, setPosts] = useState<FeedPost[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [category, setCategory] = useState('All posts'),
    [sort, setSort] = useState('Fresh'),
    [search, setSearch] = useState(''),
    [posting, setPosting] = useState(false),
    [acting, setActing] = useState(''),
    [thread, setThread] = useState<string | null>(null),
    [composing, setComposing] = useState(false);
  const load = useCallback(async () => {
    try {
      setPosts((await api<{ posts: FeedPost[] }>('/feed')).posts);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load, workspace.user?.id]);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('category');
    if (requested && categories.includes(requested)) setCategory(requested);
  }, []);
  async function publish(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setPosting(true);
    try {
      await api('/feed', Object.fromEntries(new FormData(form)));
      form.reset();
      setComposing(false);
      setCategory('All posts');
      setSort('Fresh');
      await load();
      setNotice('Posted. Your turn to start something.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPosting(false);
    }
  }
  async function react(post: FeedPost) {
    if (!workspace.user) {
      show({ type: 'auth' });
      return;
    }
    setActing(post.id);
    try {
      await api(`/feed/${post.id}/reaction`, { active: !post.reacted });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActing('');
    }
  }
  async function comment(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const form = e.currentTarget;
    setActing(id);
    try {
      await api(`/feed/${id}/comments`, Object.fromEntries(new FormData(form)));
      form.reset();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActing('');
    }
  }
  const visible = posts
    .filter(
      (p) =>
        (category === 'All posts' || p.category === category) &&
        `${p.author} ${p.content}`.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === 'Top reactions' ? b.reactions - a.reactions : b.createdAt.localeCompare(a.createdAt),
    );
  return (
    <section className="community-page">
      <div className="community-heading">
        <div>
          <span className="eyebrow">THE UNOFFICIAL HACKATHON GROUP CHAT</span>
          <h1>
            Build. Break.
            <br />
            <span className="marker-purple">Banter.</span>
          </h1>
          <p>Good ideas, questionable sleep schedules.</p>
        </div>
        <div className="feed-heading-art" aria-hidden="true">
          <span>
            git commit -m
            <br />
            "it’s a feature"
          </span>
          <b>✳</b>
        </div>
      </div>
      <div className="community-layout">
        <aside className="community-nav">
          <span className="eyebrow">YOUR CORNER OF THE INTERNET</span>
          {categories.map((item, i) => (
            <button
              key={item}
              className={category === item ? 'selected' : ''}
              onClick={() => setCategory(item)}
            >
              <span>{['↗', '⌘', '↔', '✳', '?'][i]}</span>
              {item}
              <span className="category-count">
                {posts.filter((p) => item === 'All posts' || p.category === item).length}
              </span>
            </button>
          ))}
          <Link className="toolkit-note" href="/toolkit">
            <Code2 size={25} />
            <strong>Brain buffering?</strong>
            <p>Your builder toolkit is one click away.</p>
            <span>Open toolkit ↗</span>
          </Link>
        </aside>
        <div className="feed-main">
          <div className="feed-composer">
            <span className="feed-avatar lime">
              {workspace.user?.name.charAt(0).toUpperCase() || '+'}
            </span>
            <button
              disabled={sessionLoading}
              onClick={() => (workspace.user ? setComposing(!composing) : show({ type: 'auth' }))}
            >
              What are you building? Or breaking?
            </button>
            <button
              className="icon-button"
              aria-label="Write a post"
              disabled={sessionLoading}
              onClick={() => (workspace.user ? setComposing(!composing) : show({ type: 'auth' }))}
            >
              <Plus size={21} />
            </button>
          </div>
          {composing && (
            <form className="post-form form" onSubmit={publish}>
              <label>
                Your post
                <textarea
                  name="content"
                  required
                  minLength={5}
                  maxLength={1500}
                  rows={5}
                  placeholder="Share a build log, find a teammate, or drop your best hackathon take."
                />
              </label>
              <div className="composer-bottom">
                <label>
                  <span className="sr-only">Post category</span>
                  <select name="category">
                    {categories.slice(1).map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <button className="button primary small" disabled={posting}>
                  {posting ? 'Posting...' : 'Post it'}
                  <Send size={15} />
                </button>
              </div>
            </form>
          )}
          <div className="feed-toolbar">
            <label className="feed-search">
              <Search size={16} />
              <input
                aria-label="Search the feed"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search the conversation"
              />
            </label>
            <select aria-label="Sort posts" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option>Fresh</option>
              <option>Top reactions</option>
            </select>
            <button className="icon-button" aria-label="Refresh feed" onClick={load}>
              <RefreshCw size={16} />
            </button>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {loading ? (
            <div className="loading">
              <Loader2 className="spin" />
              Loading the group chat
            </div>
          ) : visible.length ? (
            visible.map((post) => (
              <article className="feed-post" key={post.id}>
                <div className="post-head">
                  <span className={`feed-avatar ${post.color}`}>{post.author.charAt(0)}</span>
                  <div>
                    <strong>{post.author}</strong>
                    <span>{post.role}</span>
                  </div>
                  <time dateTime={post.createdAt}>
                    {new Date(post.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </time>
                </div>
                <div className="post-tags">
                  <span className={`post-category ${post.color}`}>{post.category}</span>
                  {post.sample && <span className="sample">Sample post · fictional builder</span>}
                </div>
                <p className="post-content">{post.content}</p>
                <div className="post-actions">
                  <button
                    aria-label={`${post.reacted ? 'Remove' : 'Add'} fire reaction to ${post.author} post`}
                    aria-pressed={post.reacted}
                    className={post.reacted ? 'reacted' : ''}
                    onClick={() => react(post)}
                    disabled={sessionLoading || acting === post.id}
                  >
                    <Flame size={18} />
                    {post.reactions}
                    <span>felt that</span>
                  </button>
                  <button
                    onClick={() => setThread(thread === post.id ? null : post.id)}
                    aria-expanded={thread === post.id}
                  >
                    <MessageSquare size={17} />
                    {post.comments.length}
                    <span>{post.comments.length === 1 ? 'reply' : 'replies'}</span>
                  </button>
                  <span className="post-signature mono">
                    {post.category === 'Shitpost'
                      ? 'NOT A BUG. A PERSONALITY.'
                      : post.category === 'Team up'
                        ? 'BETTER WITH A CREW.'
                        : 'KEEP BUILDING.'}
                  </span>
                </div>
                {thread === post.id && (
                  <div className="comment-thread">
                    {post.comments.length ? (
                      post.comments.map((c) => (
                        <div className="comment" key={c.id}>
                          <span className="comment-avatar">{c.author.charAt(0)}</span>
                          <div>
                            <strong>{c.author}</strong>
                            <p>{c.content}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="no-comments">Quiet in here. Fix that?</p>
                    )}
                    {workspace.user ? (
                      <form className="comment-form" onSubmit={(e) => comment(e, post.id)}>
                        <input
                          aria-label={`Reply to ${post.author}`}
                          name="content"
                          required
                          maxLength={500}
                          placeholder="Add to the conversation..."
                        />
                        <button
                          className="icon-button"
                          aria-label="Send reply"
                          disabled={sessionLoading || acting === post.id}
                        >
                          <Send size={17} />
                        </button>
                      </form>
                    ) : (
                      <button className="text-link" onClick={() => show({ type: 'auth' })}>
                        Log in to reply <ArrowUpRight size={15} />
                      </button>
                    )}
                  </div>
                )}
              </article>
            ))
          ) : (
            <div className="empty">
              <Search />
              <h3>The chat went quiet.</h3>
              <p>Try another category or start the conversation.</p>
            </div>
          )}
        </div>
        <aside className="community-right">
          <div className="side-card purple">
            <span className="eyebrow">TODAY’S UNCOMFORTABLE TRUTH</span>
            <p className="truth-quote">
              Your project doesn’t need another feature.
              <br />
              <strong>It needs a README.</strong>
            </p>
            <span className="mono">— THE MENTOR YOU NEEDED</span>
          </div>
          <div className="side-card">
            <span className="eyebrow">GOOD GROUP CHAT ENERGY</span>
            <h3>
              Bring the banter.
              <br />
              Keep it kind.
            </h3>
            <p>Share useful stuff. Credit other builders. Roast the bug, not the person.</p>
          </div>
          <Link href="/hackathons" className="side-card lime sidebar-link">
            <Users size={26} />
            <h3>
              All talk?
              <br />
              Fix that.
            </h3>
            <span>Find a hackathon ↗</span>
          </Link>
        </aside>
      </div>
    </section>
  );
}
