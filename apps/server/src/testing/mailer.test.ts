import { describe, expect, it } from 'bun:test';
import { memoryMailer } from './mailer';

const email = (to: string) => ({ to, subject: 'Votre code', text: 'Votre code : 123456' });

describe('memoryMailer', () => {
  it('gives the next email to an address, not one to another', async () => {
    const mail = memoryMailer();
    const received = mail.next('parent@example.com');
    await mail.mailer(email('autre@example.com'));
    await mail.mailer(email('parent@example.com'));
    expect(mail.codeIn(await received)).toBe('123456');
  });

  it('fails the wait for an email that never comes, rather than hanging', async () => {
    const mail = memoryMailer({ waitMs: 20 });
    const outcome = await Promise.race([mail.next('parent@example.com').catch((err: unknown) => err), Bun.sleep(200).then(() => 'still waiting')]);
    expect(outcome).toEqual(new Error('No email to parent@example.com'));
  });
});
