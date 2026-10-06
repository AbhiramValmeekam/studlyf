import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MIGRATIONS } from '../src/database/migrations/index.js';
import { normalizeGithub, normalizeLinkedin } from '../src/modules/profile/profile.schemas.js';
import { createTestContext, uniqueEmail } from './helpers.js';

let ctx;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(() => ctx.close());

const THIS_YEAR = new Date().getFullYear();
let n = 0;

async function newUser(intent) {
  const agent = request.agent(ctx.app);
  const body = { name: 'Asha Rao', email: uniqueEmail('profile'), password: 'goodpass123', ...(intent ? { intent } : {}) };
  await agent.post('/api/v1/auth/register').send(body).expect(201);
  return agent;
}

async function newBuilderWithProfile() {
  const agent = await newUser('BUILDER');
  const username = `sync-${Date.now().toString(36)}-${n++}`;
  await agent.post('/api/v1/builder/profile').send({ username, visibility: 'PUBLIC' }).expect(201);
  return { agent, username };
}

const STEP_BASIC = { name: 'Asha Rao', phone: '+91 98765 43210', gender: 'FEMALE', city: 'Chennai' };
const STEP_EDUCATION = {
  college: '  Vertex   Institute of Technology ',
  degree: 'B.Tech',
  branch: 'Computer Science & Engineering',
  yearOfStudy: '3',
  graduationYear: THIS_YEAR + 2,
};
const STEP_LINKS = { links: { github: 'octocat', linkedin: 'linkedin.com/in/asha-rao' }, interests: ['HACKATHONS', 'INTERNSHIPS'] };

describe('complete-your-profile flow', () => {
  it('a new account starts incomplete, with the required fields listed', async () => {
    const agent = await newUser();
    const me = (await agent.get('/api/v1/me')).body.data;
    expect(me.profile).toMatchObject({ college: null, links: { github: null, linkedin: null }, interests: [], completedAt: null });
    expect(me.completion.isComplete).toBe(false);
    expect(me.completion.requiredMissing).toEqual(['phone', 'college', 'degree', 'branch', 'yearOfStudy', 'graduationYear']);
  });

  it('saves step by step and marks the profile complete once required fields are in', async () => {
    const agent = await newUser();

    const basic = (await agent.patch('/api/v1/me/profile').send(STEP_BASIC).expect(200)).body.data;
    expect(basic).toMatchObject({ name: 'Asha Rao', phone: '+91 98765 43210', profile: { gender: 'FEMALE', city: 'Chennai' } });
    expect(basic.completion.isComplete).toBe(false);

    const edu = (await agent.patch('/api/v1/me/profile').send(STEP_EDUCATION).expect(200)).body.data;
    expect(edu.profile.college).toBe('Vertex Institute of Technology'); // whitespace tidied
    expect(edu.completion.isComplete).toBe(true);
    expect(edu.profile.completedAt).toBeTruthy();

    const links = (await agent.patch('/api/v1/me/profile').send(STEP_LINKS).expect(200)).body.data;
    expect(links.profile.links).toEqual({
      github: 'https://github.com/octocat',
      linkedin: 'https://www.linkedin.com/in/asha-rao',
      portfolio: null,
      website: null,
    });
    expect(links.profile.interests).toEqual(['HACKATHONS', 'INTERNSHIPS']);
    // Everything personal done except a photo: 50 of 55 personal points, normalised (no builder profile).
    expect(links.completion.score).toBe(91);
    expect(links.completion.missing).toEqual(['photo']);
    // completedAt is only stamped the first time.
    expect(links.profile.completedAt).toBe(edu.profile.completedAt);
  });

  it('merges links key-by-key and clears a link with an empty string', async () => {
    const agent = await newUser();
    await agent.patch('/api/v1/me/profile').send(STEP_LINKS).expect(200);
    const updated = (await agent.patch('/api/v1/me/profile').send({ links: { github: '' } }).expect(200)).body.data;
    expect(updated.profile.links.github).toBeNull();
    expect(updated.profile.links.linkedin).toBe('https://www.linkedin.com/in/asha-rao');
  });

  it('validates fields and names each bad one', async () => {
    const agent = await newUser();
    const bad = await agent.patch('/api/v1/me/profile').send({
      name: '',
      phone: '12345',
      yearOfStudy: '9',
      graduationYear: 1900,
      interests: ['PARTIES'],
      links: { github: 'https://gitlab.com/someone', linkedin: 'https://evil.example/in/x' },
    });
    expect(bad.status).toBe(400);
    const fields = bad.body.error.details.map((d) => d.field);
    expect(fields).toEqual(
      expect.arrayContaining(['name', 'phone', 'yearOfStudy', 'graduationYear', 'interests.0', 'links.github', 'links.linkedin']),
    );

    const pastYear = await agent.patch('/api/v1/me/profile').send({ yearOfStudy: '2', graduationYear: THIS_YEAR - 3 });
    expect(pastYear.status).toBe(400);
    expect(pastYear.body.error.details[0].field).toBe('graduationYear');

    const futureGrad = await agent.patch('/api/v1/me/profile').send({ yearOfStudy: 'GRADUATED', graduationYear: THIS_YEAR + 3 });
    expect(futureGrad.body.error.details[0].field).toBe('yearOfStudy');
  });

  it('rejects privileged or unknown fields and requires a session', async () => {
    const agent = await newUser();
    for (const body of [{ email: 'x@example.com' }, { role: 'ADMIN' }, { profile: { completedAt: '2020-01-01' } }, { completedAt: new Date() }]) {
      expect((await agent.patch('/api/v1/me/profile').send(body)).status).toBe(400);
    }
    expect((await request(ctx.app).patch('/api/v1/me/profile').send(STEP_BASIC)).status).toBe(401);
  });
});

describe('social link normalisation', () => {
  it.each([
    ['octocat', 'https://github.com/octocat'],
    ['@octocat', 'https://github.com/octocat'],
    ['github.com/octocat', 'https://github.com/octocat'],
    ['https://www.github.com/octocat/some-repo?tab=readme', 'https://github.com/octocat'],
  ])('GitHub %s → %s', (input, out) => expect(normalizeGithub(input)).toBe(out));

  it.each([['https://gitlab.com/x'], ['javascript:alert(1)'], ['https://github.com/'], ['not a username!']])('rejects GitHub %s', (input) =>
    expect(normalizeGithub(input)).toBeNull(),
  );

  it.each([
    ['asha-rao', 'https://www.linkedin.com/in/asha-rao'],
    ['linkedin.com/in/asha-rao/', 'https://www.linkedin.com/in/asha-rao'],
    ['https://in.linkedin.com/in/asha-rao?trk=x', 'https://www.linkedin.com/in/asha-rao'],
  ])('LinkedIn %s → %s', (input, out) => expect(normalizeLinkedin(input)).toBe(out));

  it.each([['https://linkedin.com/company/acme'], ['https://evil.com/in/asha'], ['https://notlinkedin.com/in/asha']])('rejects LinkedIn %s', (input) =>
    expect(normalizeLinkedin(input)).toBeNull(),
  );
});

describe('account page ⇄ builder profile sync', () => {
  it('personal edits show up on the builder profile (own and public)', async () => {
    const { agent, username } = await newBuilderWithProfile();
    await agent.patch('/api/v1/me/profile').send({ ...STEP_BASIC, ...STEP_EDUCATION, ...STEP_LINKS }).expect(200);

    const own = (await agent.get('/api/v1/builder/profile')).body.data;
    expect(own.location).toBe('Chennai');
    expect(own.links.github).toBe('https://github.com/octocat');
    expect(own.currentEducation).toEqual({
      college: 'Vertex Institute of Technology',
      degree: 'B.Tech',
      branch: 'Computer Science & Engineering',
      graduationYear: THIS_YEAR + 2,
    });

    const pub = (await request(ctx.app).get(`/api/v1/builders/${username}`)).body.data;
    expect(pub).toMatchObject({ name: 'Asha Rao', location: 'Chennai', currentEducation: { college: 'Vertex Institute of Technology' } });
    // The public page never exposes contact or sensitive personal fields.
    expect(JSON.stringify(pub)).not.toMatch(/98765|FEMALE|gender|phone|interests|HACKATHONS|yearOfStudy|email/);
  });

  it('builder-page edits of links and location update the personal profile', async () => {
    const { agent } = await newBuilderWithProfile();
    await agent
      .patch('/api/v1/builder/profile')
      .send({ location: 'Hyderabad', links: { github: 'https://github.com/asha', portfolio: 'https://asha.dev' } })
      .expect(200);
    const me = (await agent.get('/api/v1/me')).body.data;
    expect(me.profile.city).toBe('Hyderabad');
    expect(me.profile.links).toMatchObject({ github: 'https://github.com/asha', portfolio: 'https://asha.dev' });
  });

  it('shows one completion score everywhere', async () => {
    const { agent } = await newBuilderWithProfile();
    await agent.patch('/api/v1/me/profile').send({ ...STEP_BASIC, ...STEP_EDUCATION }).expect(200);
    await agent.patch('/api/v1/builder/profile').send({ headline: 'Builder of small useful things' }).expect(200);

    const me = (await agent.get('/api/v1/me')).body.data.completion.score;
    const builder = (await agent.get('/api/v1/builder/profile')).body.data.completion.score;
    const endpoint = (await agent.get('/api/v1/builder/profile/completion')).body.data.score;
    const dashboard = (await agent.get('/api/v1/builder/dashboard')).body.data.profile.completion.score;
    // phone 10 + education 20 + location 5 + headline 10 = 45 of 100
    expect(me).toBe(45);
    expect([builder, endpoint, dashboard]).toEqual([45, 45, 45]);
  });

  it('scores a builder against builder checks before the builder profile exists (no drop on create)', async () => {
    const agent = await newUser('BUILDER');
    const before = (await agent.patch('/api/v1/me/profile').send({ ...STEP_BASIC, ...STEP_EDUCATION, ...STEP_LINKS }).expect(200)).body.data
      .completion;
    // Personal 50 of 55 + builder 0 of 45 → 50%.
    expect(before.score).toBe(50);
    expect(before.missing).toEqual(expect.arrayContaining(['headline', 'bio', 'skills', 'availability', 'photo']));

    await agent.post('/api/v1/builder/profile').send({ username: `nodrop-${n++}-${Date.now().toString(36)}` }).expect(201);
    expect((await agent.get('/api/v1/me')).body.data.completion.score).toBe(50);
  });

  it('seeded sample builder is complete; sparse builders still get prompted', async () => {
    const complete = await ctx.loginAs('builder');
    expect((await complete.get('/api/v1/me')).body.data.completion.isComplete).toBe(true);

    const nova = request.agent(ctx.app);
    await nova.post('/api/v1/auth/login').send({ email: 'nova@studlyf.local', password: 'StudlyfBuilder#2026' }).expect(200);
    expect((await nova.get('/api/v1/me')).body.data.completion.isComplete).toBe(false);
  });
});

describe('0009 migration: builder links/location → personal profile', () => {
  it('copies legacy fields onto the user without overwriting, then removes them', async () => {
    const { db } = ctx.deps;
    const migration = MIGRATIONS.find((m) => m.id === '0009_personal_profile_sync');
    const builders = db.connection.collection('builder_profiles');
    const users = db.connection.collection('users');

    const { agent } = await newBuilderWithProfile();
    const me = (await agent.get('/api/v1/me')).body.data;
    // The user already chose a LinkedIn on their personal profile; legacy data must not clobber it.
    await agent.patch('/api/v1/me/profile').send({ links: { linkedin: 'asha-new' } }).expect(200);

    const { ObjectId } = await import('mongodb');
    const userId = new ObjectId(me.id);
    await builders.updateOne(
      { userId },
      { $set: { location: 'Mysuru', links: { github: 'https://github.com/legacy', linkedin: 'https://www.linkedin.com/in/legacy' } } },
    );

    await migration.up(db);

    const user = await users.findOne({ _id: userId });
    expect(user.profile.city).toBe('Mysuru');
    expect(user.profile.links.github).toBe('https://github.com/legacy');
    expect(user.profile.links.linkedin).toBe('https://www.linkedin.com/in/asha-new');
    const builder = await builders.findOne({ userId });
    expect(builder).not.toHaveProperty('links');
    expect(builder).not.toHaveProperty('location');
  });
});
