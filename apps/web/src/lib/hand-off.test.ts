import { describe, expect, it } from 'bun:test';
import { handOff } from './hand-off';

/** A tab's storage, as the browser's sessionStorage behaves. */
const memoryStorage = () => {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
    removeItem: (key: string) => {
      items.delete(key);
    },
  };
};

describe('handOff', () => {
  it('gives the next screen what the last one left, until it clears it', () => {
    const tab = handOff(memoryStorage());
    expect(tab.read('email')).toBeNull();
    tab.leave('email', 'camille@exemple.fr');
    expect(tab.read('email')).toBe('camille@exemple.fr');
    tab.clear('email');
    expect(tab.read('email')).toBeNull();
  });

  it('keeps each thing apart', () => {
    const tab = handOff(memoryStorage());
    tab.leave('signedOut', 'yes');
    expect(tab.read('email')).toBeNull();
    expect(tab.read('signedOut')).toBe('yes');
  });

  // A private window, or a browser that refuses the storage: the screens still work, without it.
  it('reads nothing and throws nothing without a storage', () => {
    const refusing = {
      getItem: () => {
        throw new Error('refused');
      },
      setItem: () => {
        throw new Error('refused');
      },
      removeItem: () => {
        throw new Error('refused');
      },
    };
    for (const tab of [handOff(refusing), handOff(undefined)]) {
      expect(() => {
        tab.leave('email', 'camille@exemple.fr');
        tab.clear('email');
      }).not.toThrow();
      expect(tab.read('email')).toBeNull();
    }
  });
});
