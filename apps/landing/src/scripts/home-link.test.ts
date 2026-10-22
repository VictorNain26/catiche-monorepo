import { describe, expect, it } from 'bun:test';
import { returnsToTop } from './home-link';

const click = { button: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false };

describe('returnsToTop', () => {
  it('brings the home page back to its top on a plain click, whatever its path is written', () => {
    for (const path of ['/', '/index', '/index.html']) expect(returnsToTop(path, click)).toBe(true);
  });

  it('lets the link lead home from any other page', () => {
    for (const path of ['/aide', '/contact', '/index/aide', '/indexes']) expect(returnsToTop(path, click)).toBe(false);
  });

  it('lets the browser do what a modified or middle click asks: a new tab, a window, a download', () => {
    for (const modifier of ['ctrlKey', 'metaKey', 'shiftKey', 'altKey'] as const) {
      expect(returnsToTop('/', { ...click, [modifier]: true })).toBe(false);
    }
    expect(returnsToTop('/', { ...click, button: 1 })).toBe(false);
  });
});
