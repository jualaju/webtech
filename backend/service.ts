import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import * as db from './store';
import { feed, FeedError } from './feed';
import { seedEvents } from './seed';
import type { Hackathon, Registration, User } from '../lib/types';
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const fail = (status: number, message: string): never => {
  throw new ApiError(status, message);
};
function field(data: Record<string, unknown>, key: string, max = 200, min = 1): string {
  const value = typeof data[key] === 'string' ? (data[key] as string).trim() : '';
  if (value.length < min || value.length > max)
    fail(400, `${key}: enter ${min}–${max} characters.`);
  return value;
}
function url(value: string) {
  try {
    const parsed = new URL(value);
    if (!['https:', 'http:'].includes(parsed.protocol)) throw 0;
    return value;
  } catch {
    return fail(400, 'Enter a valid http or https URL.');
  }
}
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const sessionCookie = (token: string, age = 604800) =>
  `ef_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${age}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
async function currentUser(cookie: string): Promise<User | null> {
  const token = cookie.match(/(?:^|;\s*)ef_session=([^;]+)/)?.[1];
  if (!token) return null;
  const session = await db.get(`SESSION#${digest(token)}`);
  if (!session || Number(session.expiresAt) < Date.now() / 1000) return null;
  const user = await db.get(
    typeof session.userPk === 'string' ? session.userPk : `USER#${session.email}`,
  );
  if (user?.demo && process.env.DEMO_AUTH_ENABLED !== 'true') return null;
  return user
    ? {
        id: String(user.id),
        name: String(user.name),
        ...(user.phone ? { phone: String(user.phone) } : { email: String(user.email) }),
      }
    : null;
}
async function allEvents(): Promise<Hackathon[]> {
  const stored = (await db.list('EVENT#')).map((x) => x.event as Hackathon);
  const events = [...seedEvents, ...stored];
  const registrations = await db.list('REG#');
  return events.map((e) => ({
    ...e,
    registrations: registrations.filter((r) => (r.registration as Registration).eventId === e.id)
      .length,
  }));
}
export async function service(
  method: string,
  pathname: string,
  data: Record<string, unknown>,
  cookie = '',
): Promise<{ status: number; body: unknown; cookie?: string }> {
  if (!data || typeof data !== 'object' || Array.isArray(data))
    fail(400, 'Expected a JSON object.');
  const user = await currentUser(cookie);
  if (pathname === '/feed' || pathname.startsWith('/feed/')) {
    try {
      return await feed(method, pathname, data, user);
    } catch (e) {
      if (e instanceof FeedError) throw new ApiError(e.status, e.message);
      throw e;
    }
  }
  if (method === 'GET' && pathname === '/workspace')
    return {
      status: 200,
      body: {
        user,
        demoAuthEnabled: process.env.DEMO_AUTH_ENABLED === 'true',
        events: await allEvents(),
        savedEventIds: user
          ? (await db.list(`SAVE#${user.id}#`))
              .filter((r) => r.active)
              .map((r) => String(r.eventId))
          : [],
        registrations: user
          ? (await db.list('REG#'))
              .map((r) => r.registration as Registration)
              .filter((r) => r.userId === user.id)
          : [],
      },
    };
  if (method === 'POST' && ['/auth/demo-phone', '/auth/demo-phone/check'].includes(pathname)) {
    if (process.env.DEMO_AUTH_ENABLED !== 'true') fail(403, 'Demo phone access is disabled.');
    const raw = field(data, 'phone', 30);
    if (!/^\+?[\d ()-]+$/.test(raw)) fail(400, 'Enter a phone number using digits.');
    const phone = raw.replace(/\D/g, '');
    if (phone.length < 7 || phone.length > 15) fail(400, 'Enter a phone number with 7–15 digits.');
    const pk = `USER#PHONE#${phone}`;
    let record = await db.get(pk);
    if (pathname.endsWith('/check'))
      return {
        status: 200,
        body: { registered: !!record, ...(record ? { name: record.name } : {}) },
      };
    field(data, 'otp', 32); // Demo only: any nonempty code is accepted; no SMS is sent.
    if (!record) {
      const next = {
        pk,
        id: randomUUID(),
        phone,
        name: field(data, 'name', 80),
        demo: true,
      };
      try {
        await db.put(next, true);
        record = next;
      } catch (e) {
        record = await db.get(pk);
        if (!record) throw e;
      }
    }
    const token = randomBytes(32).toString('hex');
    await db.put({
      pk: `SESSION#${digest(token)}`,
      userPk: pk,
      expiresAt: Math.floor(Date.now() / 1000) + 604800,
    });
    return {
      status: 200,
      body: { user: { id: record.id, name: record.name, phone: record.phone }, demo: true },
      cookie: sessionCookie(token),
    };
  }
  if (method === 'POST' && ['/auth/signup', '/auth/signin'].includes(pathname)) {
    const email = field(data, 'email', 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Enter a valid email address.');
    if (!(await db.consumeAttempt(digest(email))))
      fail(429, 'Too many sign-in attempts. Try again in 15 minutes.');
    const password = typeof data.password === 'string' ? data.password : '';
    if (password.length < 8 || password.length > 128)
      fail(400, 'Password must have 8–128 characters.');
    let record = await db.get(`USER#${email}`);
    if (pathname.endsWith('signup')) {
      if (record) fail(409, 'An account already exists for this email.');
      const salt = randomBytes(16).toString('hex');
      record = {
        pk: `USER#${email}`,
        id: randomUUID(),
        email,
        name: field(data, 'name', 80),
        salt,
        hash: scryptSync(password, salt, 64).toString('hex'),
      };
      try {
        await db.put(record, true);
      } catch (e) {
        if (
          (e as Error).message === 'CONFLICT' ||
          (e as Error).name === 'TransactionCanceledException'
        )
          fail(409, 'An account already exists for this email.');
        throw e;
      }
    } else {
      const computed = scryptSync(password, record ? String(record.salt) : 'invalid-user-salt', 64);
      if (!record || !timingSafeEqual(Buffer.from(String(record.hash), 'hex'), computed))
        fail(401, 'Email or password is incorrect.');
    }
    const token = randomBytes(32).toString('hex');
    await db.put({
      pk: `SESSION#${digest(token)}`,
      email,
      expiresAt: Math.floor(Date.now() / 1000) + 604800,
    });
    return {
      status: 200,
      body: { user: { id: record!.id, name: record!.name, email } },
      cookie: sessionCookie(token),
    };
  }
  if (method === 'POST' && pathname === '/auth/signout') {
    const token = cookie.match(/(?:^|;\s*)ef_session=([^;]+)/)?.[1];
    if (token) await db.put({ pk: `SESSION#${digest(token)}`, expiresAt: 0 });
    return { status: 200, body: { ok: true }, cookie: sessionCookie('', 0) };
  }
  if (!user) fail(401, 'Choose a demo user to continue.');
  if (method === 'POST' && pathname === '/events') {
    const startsAt = field(data, 'startsAt', 10),
      endsAt = field(data, 'endsAt', 10),
      deadline = field(data, 'deadline', 10);
    if (
      [startsAt, endsAt, deadline].some(
        (d) =>
          !/^\d{4}-\d{2}-\d{2}$/.test(d) ||
          !Number.isFinite(Date.parse(d)) ||
          new Date(d).toISOString().slice(0, 10) !== d,
      ) ||
      endsAt < startsAt ||
      deadline > startsAt ||
      new Date(deadline + 'T23:59:59Z') < new Date()
    )
      fail(400, 'Use future dates. Registration must close before the event starts.');
    const prize = Number(data.prize),
      teamSize = Number(data.teamSize),
      capacity = Number(data.capacity);
    if (
      !Number.isInteger(prize) ||
      prize < 0 ||
      prize > 10000000 ||
      !Number.isInteger(teamSize) ||
      teamSize < 1 ||
      teamSize > 6 ||
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      capacity > 1000
    )
      fail(400, 'Check prize, team size (1–6), and capacity (1–1000).');
    const mode = field(data, 'mode');
    if (!['Online', 'In person', 'Hybrid'].includes(mode)) fail(400, 'Choose an event format.');
    const event: Hackathon = {
      id: randomUUID(),
      title: field(data, 'title', 80),
      organizer: field(data, 'organizer', 80),
      description: field(data, 'description', 3000, 20),
      track: field(data, 'track', 60),
      mode,
      location: field(data, 'location', 150),
      startsAt,
      endsAt,
      deadline,
      prize,
      teamSize,
      capacity,
      ownerId: user!.id,
      color: ['lime', 'purple', 'orange', 'pink'][Math.floor(Math.random() * 4)],
      registrations: 0,
    };
    await db.put({ pk: `EVENT#${event.id}`, event });
    return { status: 201, body: { event } };
  }
  const match = pathname.match(/^\/events\/([^/]+)\/(register|submission|participants|bookmark)$/);
  if (match) {
    const event = (await allEvents()).find((e) => e.id === match[1]);
    if (!event) fail(404, 'Hackathon not found.');
    if (method === 'GET' && match[2] === 'participants') {
      if (event!.ownerId !== user!.id) fail(403, 'Only the organizer can view teams.');
      return {
        status: 200,
        body: {
          registrations: (await db.list('REG#'))
            .map((r) => r.registration as Registration)
            .filter((r) => r.eventId === event!.id),
        },
      };
    }
    if (method === 'POST' && match[2] === 'bookmark') {
      if (typeof data.saved !== 'boolean') fail(400, 'Choose a bookmark state.');
      await db.put({ pk: `SAVE#${user!.id}#${event!.id}`, eventId: event!.id, active: data.saved });
      return { status: 200, body: { saved: data.saved } };
    }
    const pk = `REG#${event!.id}#${user!.id}`;
    const existing = await db.get(pk);
    if (method === 'POST' && match[2] === 'register') {
      if (existing) fail(409, 'You already registered for this hackathon.');
      if (event!.ownerId === user!.id) fail(400, 'You are organizing this hackathon.');
      if (new Date(event!.deadline + 'T23:59:59Z') < new Date())
        fail(400, 'Registration has closed.');
      const members = field(data, 'members', 500, 0);
      const count = members ? members.split(',').filter((x) => x.trim()).length + 1 : 1;
      if (count > event!.teamSize)
        fail(400, `Teams can have up to ${event!.teamSize} members, including you.`);
      const registration: Registration = {
        id: randomUUID(),
        eventId: event!.id,
        userId: user!.id,
        teamName: field(data, 'teamName', 80),
        members,
        createdAt: new Date().toISOString(),
      };
      // Claim a numbered capacity slot and registration atomically; retries handle concurrent registrations.
      let saved = false;
      for (let slot = event!.registrations; slot < event!.capacity && !saved; slot++) {
        try {
          await db.transact([
            { item: { pk, registration }, unique: true },
            { item: { pk: `SLOT#${event!.id}#${slot}`, userId: user!.id }, unique: true },
          ]);
          saved = true;
        } catch (e) {
          if (await db.get(pk)) fail(409, 'You already registered.');
          if (
            (e as Error).message !== 'CONFLICT' &&
            (e as Error).name !== 'TransactionCanceledException'
          )
            throw e;
        }
      }
      if (!saved) fail(409, 'This hackathon is full.');
      return { status: 201, body: { registration } };
    }
    if (method === 'POST' && match[2] === 'submission') {
      if (!existing) fail(403, 'Register a team before submitting.');
      if (new Date(event!.endsAt + 'T23:59:59Z') < new Date())
        fail(400, 'Submissions have closed.');
      const registration = existing!.registration as Registration;
      registration.submission = {
        title: field(data, 'title', 100),
        description: field(data, 'description', 3000, 20),
        repository: url(field(data, 'repository', 500)),
        demo: data.demo ? url(field(data, 'demo', 500)) : '',
        submittedAt: new Date().toISOString(),
      };
      await db.put({ pk, registration });
      return { status: 200, body: { registration } };
    }
  }
  return fail(404, 'Endpoint not found.');
}
