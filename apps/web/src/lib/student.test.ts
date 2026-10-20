import { describe, expect, it } from 'bun:test';
import { announceProfileChange, CODE_DIGITS, listenForProfileChange, pressKey, profileNote, studentCodeMessage } from './student';

describe('pressKey', () => {
  it('adds a digit, up to six', () => {
    expect(pressKey('', '4')).toBe('4');
    expect(pressKey('48291', '7')).toBe('482917');
    expect(pressKey('482917', '3')).toBe('482917');
    expect(CODE_DIGITS).toBe(6);
  });

  it('takes back the last digit, and nothing from an empty code', () => {
    expect(pressKey('482', 'Backspace')).toBe('48');
    expect(pressKey('', 'Backspace')).toBe('');
  });

  it('ignores any other key', () => {
    expect(pressKey('48', 'a')).toBe('48');
    expect(pressKey('48', 'Enter')).toBe('48');
    expect(pressKey('48', '٣')).toBe('48');
  });
});

describe('studentCodeMessage', () => {
  it('tells a wrong code apart from a profile blocked here, and from one locked everywhere', () => {
    const wrong = studentCodeMessage({ code: 'INVALID_CODE', status: 401 });
    const blocked = studentCodeMessage({ code: 'PROFILE_BLOCKED', status: 403 });
    const locked = studentCodeMessage({ code: 'PROFILE_LOCKED', status: 403 });
    expect(new Set([wrong, blocked, locked]).size).toBe(3);
    expect(wrong).toContain('Réessaie');
    expect(blocked).toContain('demande à ton parent');
    expect(locked).toContain('nouveau code');
  });

  it('says why a chosen code is refused', () => {
    expect(studentCodeMessage({ code: 'CODE_TOO_EASY', status: 400 })).toContain('trop facile');
    expect(studentCodeMessage({ code: 'CODE_IS_BIRTH_DATE', status: 400 })).toContain('naissance');
  });

  it('asks to wait on a rate limit, and falls back without the server’s words', () => {
    expect(studentCodeMessage({ code: 'INVALID_CODE', status: 429 })).toStartWith('Trop d’essais.');
    expect(studentCodeMessage({ code: 'SOMETHING_NEW', status: 400 })).toBe('Une erreur est survenue. Réessaie dans un instant.');
    expect(studentCodeMessage({ status: 500 })).toBe('Une erreur est survenue. Réessaie dans un instant.');
  });

  it('speaks to the student, never as to a parent', () => {
    for (const code of ['INVALID_CODE', 'PROFILE_BLOCKED', 'PROFILE_LOCKED', 'CODE_TOO_EASY', 'INVALID_ACTIVATION_CODE']) {
      expect(studentCodeMessage({ code, status: 400 })).not.toMatch(/\bvous\b|\bvotre\b|enfant/i);
    }
  });
});

describe('profileNote', () => {
  it('says what waits behind a name on the list, and nothing for a profile ready', () => {
    expect(profileNote('ready')).toBeNull();
    expect(profileNote('choose')).toBe('Choisis ton code');
    expect(profileNote('waiting')).toContain('parent');
    expect(profileNote('blocked')).toContain('Bloqué');
    expect(profileNote('locked')).toContain('nouveau code');
  });
});

/** A BroadcastChannel of tabs that share one origin, in memory. */
function tabs() {
  const listeners = new Set<(event: { data: unknown }) => void>();
  return () => {
    const own = new Set<(event: { data: unknown }) => void>();
    return {
      postMessage: (data: unknown) => {
        // A channel never hears its own messages, only the other tabs'.
        for (const listener of listeners) if (!own.has(listener)) listener({ data });
      },
      addEventListener: (_type: 'message', listener: (event: { data: unknown }) => void) => {
        own.add(listener);
        listeners.add(listener);
      },
    };
  };
}

describe('a change of profile', () => {
  it('reloads the other tabs of the device, never the one that made it', () => {
    const open = tabs();
    const reloads: string[] = [];
    listenForProfileChange(open(), () => reloads.push('other'));
    const self = open();
    listenForProfileChange(self, () => reloads.push('self'));
    announceProfileChange(self);
    expect(reloads).toEqual(['other']);
  });

  it('ignores a message of another kind on the channel', () => {
    const open = tabs();
    const reloads: string[] = [];
    listenForProfileChange(open(), () => reloads.push('reload'));
    open().postMessage('hello');
    expect(reloads).toEqual([]);
  });
});
