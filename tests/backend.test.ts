import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
// The store resolves its data location on import, isolating tests from developer data.
test('isolated backend integration', async () => {
  const original = process.cwd();
  const directory = await mkdtemp(path.join(tmpdir(), 'eventforge-'));
  process.chdir(directory);
  const { service, ApiError } = await import('../backend/service');
  let cookie = '',
    secondCookie = '',
    createdId = '';
  const call = (method: string, route: string, data = {}, session = cookie) =>
    service(method, route, data, session);
  async function rejects(status: number, fn: () => Promise<unknown>) {
    await assert.rejects(fn, (e) => e instanceof ApiError && e.status === status);
  }
  await test('Hackathon lifecycle and access boundaries', async (t) => {
    await t.test('public listing and unauthorized write', async () => {
      const response = await call('GET', '/workspace');
      assert.equal((response.body as any).events.length, 6);
      assert.equal((response.body as any).user, null);
      await rejects(401, () => call('POST', '/events', {}));
    });
    await t.test('signup issues HttpOnly session; wrong password is rejected', async () => {
      const out = await call('POST', '/auth/signup', {
        name: 'Builder One',
        email: 'builder@example.com',
        password: 'sufficient-password',
      });
      cookie = out.cookie!.split(';')[0];
      assert.match(out.cookie!, /HttpOnly/);
      await rejects(409, () =>
        call('POST', '/auth/signup', {
          name: 'Duplicate',
          email: 'builder@example.com',
          password: 'sufficient-password',
        }),
      );
      await rejects(401, () =>
        call('POST', '/auth/signin', { email: 'builder@example.com', password: 'wrong-password' }),
      );
    });
    await t.test('team validation, duplicate protection, project submission', async () => {
      await rejects(400, () =>
        call('POST', '/events/buildspace-26/register', { teamName: 'Too big', members: 'A,B,C,D' }),
      );
      await call('POST', '/events/buildspace-26/register', {
        teamName: 'Ship Happens',
        members: 'Alex',
      });
      await rejects(409, () =>
        call('POST', '/events/buildspace-26/register', { teamName: 'Again', members: '' }),
      );
      await rejects(400, () =>
        call('POST', '/events/buildspace-26/submission', {
          title: 'Test',
          description: 'A working campus project with useful features',
          repository: 'javascript:alert(1)',
        }),
      );
      await call('POST', '/events/buildspace-26/submission', {
        title: 'Campus Kit',
        description: 'A working campus project with useful features',
        repository: 'https://github.com/example/campus',
      });
      const state = (await call('GET', '/workspace')).body as any;
      assert.equal(state.registrations[0].submission.title, 'Campus Kit');
      assert.equal(state.events[0].registrations, 1);
      await rejects(403, () => call('GET', '/events/buildspace-26/participants'));
    });
    await t.test('organizer creation validation and permissions', async () => {
      const data = {
        title: 'One Slot',
        organizer: 'Campus Club',
        description: 'Build a useful tool for your local campus.',
        track: 'Open innovation',
        mode: 'Online',
        location: 'Online',
        startsAt: '2027-03-10',
        endsAt: '2027-03-12',
        deadline: '2027-03-08',
        teamSize: 2,
        capacity: 1,
        prize: 1000,
      };
      await rejects(400, () => call('POST', '/events', { ...data, deadline: '2027-04-01' }));
      const out = await call('POST', '/events', data);
      createdId = (out.body as any).event.id;
      await rejects(400, () =>
        call('POST', `/events/${createdId}/register`, { teamName: 'Self', members: '' }),
      );
      assert.deepEqual((await call('GET', `/events/${createdId}/participants`)).body, {
        registrations: [],
      });
      const second = await call('POST', '/auth/signup', {
        name: 'Builder Two',
        email: 'two@example.com',
        password: 'another-password',
      });
      secondCookie = second.cookie!.split(';')[0];
      await rejects(403, () => call('GET', `/events/${createdId}/participants`, {}, secondCookie));
      await call(
        'POST',
        `/events/${createdId}/register`,
        { teamName: 'Only Team', members: '' },
        secondCookie,
      );
      const third = await call('POST', '/auth/signup', {
        name: 'Builder Three',
        email: 'three@example.com',
        password: 'another-password',
      });
      await rejects(409, () =>
        call(
          'POST',
          `/events/${createdId}/register`,
          { teamName: 'Full Team', members: '' },
          third.cookie!.split(';')[0],
        ),
      );
      assert.equal(
        ((await call('GET', `/events/${createdId}/participants`)).body as any).registrations.length,
        1,
      );
    });
    await t.test('bookmarks are private, persistent, and idempotent', async () => {
      await call('POST', '/events/buildspace-26/bookmark', { saved: true });
      await call('POST', '/events/buildspace-26/bookmark', { saved: true });
      assert.deepEqual(((await call('GET', '/workspace')).body as any).savedEventIds, [
        'buildspace-26',
      ]);
      assert.deepEqual(
        ((await call('GET', '/workspace', {}, secondCookie)).body as any).savedEventIds,
        [],
      );
      await call('POST', '/events/buildspace-26/bookmark', { saved: false });
      assert.deepEqual(((await call('GET', '/workspace')).body as any).savedEventIds, []);
    });
    await t.test('feed identity, reactions, replies, and validation', async () => {
      const initial = (await call('GET', '/feed', {}, '')).body as any;
      assert.equal(initial.posts.length, 6);
      assert.ok(initial.posts.every((p: any) => p.sample));
      await rejects(401, () =>
        call('POST', '/feed', { category: 'Shitpost', content: 'Hello builders' }, ''),
      );
      await rejects(400, () =>
        call('POST', '/feed', { category: 'Invalid', content: 'Hello builders' }),
      );
      const response = await call('POST', '/feed', {
        category: 'Build log',
        content: 'Shipped a working serverless project today.',
        author: 'Impersonation',
      });
      const post = (response.body as any).post;
      assert.equal(post.author, 'Builder One');
      assert.equal(post.sample, undefined);
      await call('POST', `/feed/${post.id}/reaction`, { active: true }, secondCookie);
      await call('POST', `/feed/${post.id}/reaction`, { active: true }, secondCookie);
      await call('POST', `/feed/${post.id}/comments`, { content: 'Nicely shipped.' }, secondCookie);
      const all = ((await call('GET', '/feed', {}, secondCookie)).body as any).posts;
      const updated = all.find((p: any) => p.id === post.id);
      assert.equal(updated.reactions, 1);
      assert.equal(updated.reacted, true);
      assert.equal(updated.comments[0].author, 'Builder Two');
      await call('POST', `/feed/${post.id}/reaction`, { active: false }, secondCookie);
      const mine = ((await call('GET', '/feed')).body as any).posts.find(
        (p: any) => p.id === post.id,
      );
      assert.equal(mine.reactions, 0);
      await rejects(404, () => call('POST', '/feed/missing/comments', { content: 'Hello' }));
      await rejects(400, () => call('POST', `/feed/${post.id}/comments`, { content: ' ' }));
    });
    await t.test('sessions persist and signout invalidates server session', async () => {
      assert.equal(
        ((await call('GET', '/workspace')).body as any).user.email,
        'builder@example.com',
      );
      await call('POST', '/auth/signout', {});
      assert.equal(((await call('GET', '/workspace')).body as any).user, null);
      await rejects(401, () => call('POST', `/events/${createdId}/submission`, {}));
    });
  });
  await test('demo phone auth requests a name once and isolates users and sessions', async () => {
    const previous = process.env.DEMO_AUTH_ENABLED;
    process.env.DEMO_AUTH_ENABLED = 'false';
    try {
      await rejects(403, () =>
        call('POST', '/auth/demo-phone', { phone: '9876543210', otp: '123' }),
      );
      process.env.DEMO_AUTH_ENABLED = 'true';
      assert.deepEqual(
        (await call('POST', '/auth/demo-phone/check', { phone: '9876543210' })).body,
        { registered: false },
      );
      await rejects(400, () =>
        call('POST', '/auth/demo-phone', { phone: '9876543210', otp: '123' }),
      );
      await rejects(400, () =>
        call('POST', '/auth/demo-phone', { phone: '9876543210', name: 'Alice', otp: '' }),
      );
      const one = await call('POST', '/auth/demo-phone', {
        phone: '9876543210',
        name: 'Alice',
        otp: '1',
      });
      const first = one.cookie!.split(';')[0];
      assert.equal((one.body as any).user.name, 'Alice');
      assert.deepEqual(
        (await call('POST', '/auth/demo-phone/check', { phone: '98765 43210' })).body,
        { registered: true, name: 'Alice' },
      );
      await call('POST', '/events/buildspace-26/bookmark', { saved: true }, first);
      const again = await call('POST', '/auth/demo-phone', {
        phone: '98765-43210',
        name: 'Do not rename',
        otp: 'anything',
      });
      const otherSession = again.cookie!.split(';')[0];
      assert.equal((again.body as any).user.id, (one.body as any).user.id);
      assert.equal((again.body as any).user.name, 'Alice');
      assert.deepEqual(
        ((await call('GET', '/workspace', {}, otherSession)).body as any).savedEventIds,
        ['buildspace-26'],
      );
      const two = await call('POST', '/auth/demo-phone', {
        phone: '9876543211',
        name: 'Bob',
        otp: '999999',
      });
      const second = two.cookie!.split(';')[0];
      assert.notEqual((two.body as any).user.id, (one.body as any).user.id);
      assert.deepEqual(
        ((await call('GET', '/workspace', {}, second)).body as any).savedEventIds,
        [],
      );
      assert.equal(((await call('GET', '/workspace', {}, first)).body as any).user.name, 'Alice');
      await call('POST', '/auth/signout', {}, first);
      assert.equal(((await call('GET', '/workspace', {}, first)).body as any).user, null);
      assert.equal(
        ((await call('GET', '/workspace', {}, otherSession)).body as any).user.name,
        'Alice',
      );
      assert.equal(((await call('GET', '/workspace', {}, second)).body as any).user.name, 'Bob');
      process.env.DEMO_AUTH_ENABLED = 'false';
      assert.equal(((await call('GET', '/workspace', {}, second)).body as any).user, null);
    } finally {
      if (previous === undefined) delete process.env.DEMO_AUTH_ENABLED;
      else process.env.DEMO_AUTH_ENABLED = previous;
    }
  });
  await test('authentication attempts are throttled', async () => {
    for (let i = 0; i < 10; i++)
      await rejects(401, () =>
        call('POST', '/auth/signin', {
          email: 'limited@example.com',
          password: 'invalid-password',
        }),
      );
    await rejects(429, () =>
      call('POST', '/auth/signin', { email: 'limited@example.com', password: 'invalid-password' }),
    );
  });
  process.chdir(original);
  await rm(directory, { recursive: true, force: true });
});
