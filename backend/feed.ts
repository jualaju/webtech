import { randomUUID } from 'node:crypto';
import * as db from './store';
import { seedPosts } from './feed-seed';
import type { FeedCategory, FeedComment, FeedPost, User } from '../lib/types';
const categories: FeedCategory[] = ['Build log', 'Team up', 'Shitpost', 'Question'];
export class FeedError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function text(value: unknown, max: number, min = 1) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max)
    throw new FeedError(400, `Write ${min}–${max} characters.`);
  return value.trim();
}
async function posts() {
  return [...seedPosts, ...(await db.list('POST#')).map((r) => r.post as FeedPost)];
}
export async function feed(
  method: string,
  path: string,
  data: Record<string, unknown>,
  user: User | null,
): Promise<{ status: number; body: unknown }> {
  if (method === 'GET' && path === '/feed') {
    const [all, reactions, comments] = await Promise.all([
      posts(),
      db.list('REACTION#'),
      db.list('COMMENT#'),
    ]);
    return {
      status: 200,
      body: {
        posts: all
          .map((p) => ({
            ...p,
            reactions: reactions.filter((r) => r.postId === p.id && r.active).length,
            reacted: reactions.some((r) => r.postId === p.id && r.userId === user?.id && r.active),
            comments: comments
              .filter((r) => r.postId === p.id)
              .map((r) => r.comment as FeedComment)
              .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
          }))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      },
    };
  }
  if (!user) throw new FeedError(401, 'Choose a demo user to join the conversation.');
  if (method === 'POST' && path === '/feed') {
    if (!(await db.consumeAttempt('post#' + user.id, 5)))
      throw new FeedError(429, 'Five posts in 15 minutes is plenty. Let someone else cook.');
    if (!categories.includes(data.category as FeedCategory))
      throw new FeedError(400, 'Choose a post category.');
    const post: FeedPost = {
      id: randomUUID(),
      author: user.name,
      authorId: user.id,
      role: 'Community builder',
      category: data.category as FeedCategory,
      content: text(data.content, 1500, 5),
      createdAt: new Date().toISOString(),
      color: ['lime', 'purple', 'orange', 'pink'][Math.floor(Math.random() * 4)],
      reactions: 0,
      reacted: false,
      comments: [],
    };
    await db.put({ pk: 'POST#' + post.id, post });
    return { status: 201, body: { post } };
  }
  const match = path.match(/^\/feed\/([^/]+)\/(reaction|comments)$/);
  if (!match || method !== 'POST') throw new FeedError(404, 'Post not found.');
  const post = (await posts()).find((p) => p.id === match[1]);
  if (!post) throw new FeedError(404, 'Post not found.');
  if (match[2] === 'reaction') {
    if (typeof data.active !== 'boolean') throw new FeedError(400, 'Choose a reaction state.');
    await db.put({
      pk: `REACTION#${post.id}#${user.id}`,
      postId: post.id,
      userId: user.id,
      active: data.active,
    });
    return { status: 200, body: { ok: true } };
  }
  if (!(await db.consumeAttempt('comment#' + user.id, 20)))
    throw new FeedError(429, 'Take a breather. Try commenting again in 15 minutes.');
  const comment: FeedComment = {
    id: randomUUID(),
    author: user.name,
    authorId: user.id,
    content: text(data.content, 500),
    createdAt: new Date().toISOString(),
  };
  await db.put({ pk: `COMMENT#${post.id}#${comment.id}`, postId: post.id, comment });
  return { status: 201, body: { comment } };
}
