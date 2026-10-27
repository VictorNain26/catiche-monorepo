import { describe, expect, it } from 'bun:test';
import { newsLines } from './news';

const TABLET = 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const day = (date: number) => new Date(2026, 9, date, 18, 0).toISOString();

describe('newsLines', () => {
  it('says nothing when nothing changed: the card does not show', () => {
    expect(newsLines({ codeChangedAt: null, devices: [] }, ['Nadia', 'Karim'])).toEqual([]);
  });

  it('says the day the code changed', () => {
    expect(newsLines({ codeChangedAt: day(24), devices: [] }, ['Nadia', 'Karim'])).toEqual(['Ton code a été changé le 24 octobre.']);
  });

  it('says each device that took the profile, and whom to tell if it was not the student', () => {
    expect(newsLines({ codeChangedAt: null, devices: [{ userAgent: TABLET, createdAt: day(26) }] }, ['Nadia', 'Karim'])).toEqual([
      'Ton espace s’ouvre aussi sur une tablette depuis le 26 octobre. Si ce n’est pas toi, dis-le à Nadia ou à Karim.',
    ]);
    expect(newsLines({ codeChangedAt: null, devices: [{ userAgent: IPHONE, createdAt: day(25) }] }, ['Nadia'])).toEqual([
      'Ton espace s’ouvre aussi sur un téléphone depuis le 25 octobre. Si ce n’est pas toi, dis-le à Nadia.',
    ]);
  });

  it('says the code first, then the devices, the newest first as the server sends them', () => {
    const lines = newsLines(
      {
        codeChangedAt: day(24),
        devices: [
          { userAgent: TABLET, createdAt: day(26) },
          { userAgent: null, createdAt: day(25) },
        ],
      },
      [],
    );
    expect(lines).toEqual([
      'Ton code a été changé le 24 octobre.',
      'Ton espace s’ouvre aussi sur une tablette depuis le 26 octobre. Si ce n’est pas toi, dis-le à tes parents.',
      'Ton espace s’ouvre aussi sur un appareil depuis le 25 octobre. Si ce n’est pas toi, dis-le à tes parents.',
    ]);
  });
});
