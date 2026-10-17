import { describe, expect, it } from 'bun:test';
import { ageAt } from '../domain/memory-consent';
import { testApp } from './app';
import { testDatabase } from './database';
import { birthMonthAged, httpClient } from './http';
import { memoryMailer } from './mailer';

const { db } = await testDatabase();

describe('birthMonthAged', () => {
  it('gives a child exactly that age on any day of the year', () => {
    for (const day of ['2027-01-01', '2027-02-10', '2027-03-31', '2027-12-31']) {
      const now = new Date(`${day}T12:00:00Z`);
      expect({ day, age: ageAt(`${birthMonthAged(15, now)}-01`, now) }).toEqual({ day, age: 15 });
    }
  });
});

describe('httpClient', () => {
  it('keeps the session cookie better-auth sets over https, under its __Secure- name', async () => {
    const { api } = testApp(db, { origin: 'https://catiche.test' });
    const cookie = await api.guardian('https@example.com');
    expect(cookie).toStartWith('__Secure-better-auth.session_token=');
    expect(await api.sessionUser(cookie)).toBeDefined();
  });

  it('fails a sign-in whose code is refused without leaving the wait for its email to reject unhandled', async () => {
    const { app } = testApp(db);
    const api = httpClient(app, memoryMailer({ waitMs: 20 }), db);
    const refused = await api.signIn('not-an-address').then(
      () => 'signed in',
      (caught: unknown) => String(caught),
    );
    expect(refused).toStartWith('Error: code: HTTP 400');
    // Past the wait: bun fails the test on a rejection left unhandled meanwhile.
    await Bun.sleep(100);
  });
});
