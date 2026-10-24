import { describe, expect, it } from 'bun:test';
import { deviceKind, deviceName, formatDate, formatDay, formatHour } from './device';

describe('deviceName', () => {
  it('names a phone by its system and browser', () => {
    expect(
      deviceName(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      ),
    ).toBe('iOS · Safari');
    expect(deviceName('Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36')).toBe(
      'Android · Chrome',
    );
  });

  it('says so for a user agent it cannot read, or none', () => {
    expect(deviceName('test-device')).toBe('Appareil inconnu');
    expect(deviceName(null)).toBe('Appareil inconnu');
    expect(deviceName('')).toBe('Appareil inconnu');
  });
});

describe('deviceKind', () => {
  const IPHONE =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
  const TABLET = 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
  const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';

  it('names a phone, a tablet and a computer, each with its own article and agreement', () => {
    expect(deviceKind(IPHONE)).toEqual({ the: 'le téléphone', this: 'ce téléphone', blocked: 'bloqué' });
    expect(deviceKind(TABLET)).toEqual({ the: 'la tablette', this: 'cette tablette', blocked: 'bloquée' });
    expect(deviceKind(DESKTOP)).toEqual({ the: 'l’ordinateur', this: 'cet ordinateur', blocked: 'bloqué' });
  });

  it('says « appareil » when it cannot tell', () => {
    expect(deviceKind('test-device')).toEqual({ the: 'l’appareil', this: 'cet appareil', blocked: 'bloqué' });
    expect(deviceKind(null)).toEqual({ the: 'l’appareil', this: 'cet appareil', blocked: 'bloqué' });
  });
});

describe('formatDay and formatHour', () => {
  // A local date: the same text whatever the time zone of the machine.
  const date = new Date(2026, 9, 7, 14, 32);

  it('write the day and the hour as a French reader does', () => {
    expect(formatDay(date)).toBe('7 octobre 2026 à 14:32');
    expect(formatHour(date)).toBe('14:32');
  });

  it('read the ISO text the server sends', () => {
    expect(formatHour(date.toISOString())).toBe('14:32');
  });

  it('write the day alone, as a line of the history does', () => {
    expect(formatDate(new Date(2026, 2, 3, 9, 0))).toBe('3 mars');
  });
});
