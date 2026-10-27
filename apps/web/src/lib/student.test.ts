import { describe, expect, it } from 'bun:test';
import {
  announceProfileChange,
  chooseTokenFor,
  codeSecret,
  firstCodeRefusal,
  forgottenText,
  forgottenTitle,
  keepChooseTokens,
  listenForProfileChange,
  pressKey,
  profileNote,
  STUDENT_FAILED,
  studentCodeMessage,
} from './student';

describe('pressKey', () => {
  it('adds a digit, up to six', () => {
    expect(pressKey('', '4')).toBe('4');
    expect(pressKey('48291', '7')).toBe('482917');
    expect(pressKey('482917', '3')).toBe('482917');
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

const TWO = ['Nadia', 'Karim'];
const ONE = ['Nadia'];

describe('studentCodeMessage', () => {
  it('says a wrong code, and asks to try again', () => {
    expect(studentCodeMessage({ code: 'INVALID_CODE', status: 401 }, TWO)).toEqual({ title: 'Ce n’est pas ton code. Réessaie.' });
  });

  it('says one thing of a profile blocked here and of a code stopped everywhere, naming who is told', () => {
    const blocked = studentCodeMessage({ code: 'PROFILE_BLOCKED', status: 403 }, TWO);
    expect(blocked).toEqual({ title: 'Ton code ne marche plus ici.', detail: 'Nadia et Karim sont prévenus.' });
    expect(studentCodeMessage({ code: 'PROFILE_LOCKED', status: 403 }, TWO)).toEqual(blocked);
    expect(studentCodeMessage({ code: 'PROFILE_LOCKED', status: 403 }, ONE)).toEqual({
      title: 'Ton code ne marche plus ici.',
      detail: 'Nadia est au courant.',
    });
  });

  it('says why a chosen code is refused, and what to do', () => {
    expect(studentCodeMessage({ code: 'CODE_TOO_EASY', status: 400 }, TWO)).toEqual({
      title: 'Ce code est trop facile à deviner.',
      detail: 'Évite les suites et les chiffres répétés.',
    });
    expect(studentCodeMessage({ code: 'CODE_IS_BIRTH_DATE', status: 400 }, TWO)).toEqual({
      title: 'C’est ta date de naissance.',
      detail: 'Choisis un autre code.',
    });
    expect(studentCodeMessage({ code: 'CODE_NOT_EXPECTED', status: 403 }, TWO)).toEqual({
      title: 'Le temps est passé.',
      detail: 'Demande un nouveau code de départ.',
    });
  });

  it('names a starting code refused by its name, and says what to ask for', () => {
    expect(studentCodeMessage({ code: 'INVALID_ACTIVATION_CODE', status: 400 }, TWO)).toEqual({
      title: 'Ce code ne marche pas, ou il a expiré.',
      detail: 'Demande un nouveau code de départ.',
    });
  });

  it('asks to wait on a rate limit, and falls back without the server’s words', () => {
    expect(studentCodeMessage({ code: 'INVALID_CODE', status: 429 }, TWO)).toEqual({
      title: 'Trop d’essais. Attends une minute avant de réessayer.',
    });
    expect(studentCodeMessage({ code: 'SOMETHING_NEW', status: 400 }, TWO)).toEqual(STUDENT_FAILED);
    expect(studentCodeMessage({ status: 500 }, TWO)).toEqual(STUDENT_FAILED);
  });

  it('says a failure without a pronoun, the way the general error does', () => {
    expect(STUDENT_FAILED).toEqual({ title: 'Ça n’a pas marché.', detail: 'Internet a peut-être coupé.' });
  });

  it('speaks to the student, never as to a parent', () => {
    for (const code of ['INVALID_CODE', 'PROFILE_BLOCKED', 'PROFILE_LOCKED', 'CODE_TOO_EASY', 'INVALID_ACTIVATION_CODE', 'CODE_NOT_EXPECTED']) {
      const { title, detail = '' } = studentCodeMessage({ code, status: 400 }, TWO);
      expect(`${title} ${detail}`).not.toMatch(/\bvous\b|\bvotre\b|enfant|ton parent/i);
    }
  });
});

describe('firstCodeRefusal', () => {
  it('refuses a code too easy to guess at its first typing, by the server’s own rule', () => {
    expect(firstCodeRefusal('123456')).toEqual(studentCodeMessage({ code: 'CODE_TOO_EASY', status: 400 }, []));
    expect(firstCodeRefusal('111111')).toEqual(studentCodeMessage({ code: 'CODE_TOO_EASY', status: 400 }, []));
    expect(firstCodeRefusal('147258')).not.toBeNull();
  });

  it('takes any other code, the birth date left to the server, which knows it', () => {
    expect(firstCodeRefusal('920374')).toBeNull();
    expect(firstCodeRefusal('201403')).toBeNull();
  });
});

describe('the words of the codes', () => {
  it('says that the parents see neither the code nor the conversations (E2)', () => {
    expect(codeSecret(TWO)).toBe('Nadia et Karim ne voient ni ton code, ni tes conversations avec Tom.');
    expect(codeSecret(ONE)).toBe('Nadia ne voit ni ton code, ni tes conversations avec Tom.');
    expect(codeSecret([])).toBe('Tes parents ne voient ni ton code, ni tes conversations avec Tom.');
  });

  it('says who is told of a forgotten code, and what to do then (E3)', () => {
    expect(forgottenTitle(TWO)).toBe('Nadia et Karim sont prévenus');
    expect(forgottenText(TWO)).toBe('Ils le voient en ouvrant Catiche. Quand ils te donnent un code de départ, touche le bouton.');
    expect(forgottenTitle(ONE)).toBe('Nadia est au courant');
    expect(forgottenText(ONE)).toBe('Nadia le voit en ouvrant Catiche. Quand Nadia te donne un code de départ, touche le bouton.');
    expect(forgottenTitle([])).toBe('Tes parents sont prévenus');
    expect(forgottenText([])).toBe('Ils le voient en ouvrant Catiche. Quand ils te donnent un code de départ, touche le bouton.');
  });
});

describe('the token of a window to choose a code', () => {
  it('stays with the tab that opened the window, for that student only', () => {
    keepChooseTokens({ lea: 'jeton-de-lea' });
    expect(chooseTokenFor('lea')).toBe('jeton-de-lea');
    expect(chooseTokenFor('tom')).toBeUndefined();
  });
});

describe('profileNote', () => {
  it('says, under a name blocked here or stopped everywhere, whom to ask', () => {
    expect(profileNote('blocked', TWO)).toBe('Bloqué ici. Demande à Nadia ou à Karim.');
    expect(profileNote('locked', TWO)).toBe('Bloqué ici. Demande à Nadia ou à Karim.');
    expect(profileNote('blocked', ONE)).toBe('Bloqué ici. Demande à Nadia.');
    expect(profileNote('blocked', [])).toBe('Bloqué ici. Demande à tes parents.');
  });

  it('says a code to choose, and nothing for a profile ready or waiting for a starting code', () => {
    expect(profileNote('choose', TWO)).toBe('Choisis ton code');
    expect(profileNote('ready', TWO)).toBeNull();
    expect(profileNote('waiting', TWO)).toBeNull();
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
