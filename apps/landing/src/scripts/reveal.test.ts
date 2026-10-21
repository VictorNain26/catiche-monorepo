import { describe, expect, it } from 'bun:test';
import { type Entry, release, REVEAL_MARGIN, reveal, type RevealHost } from './reveal';

// A block on the page: where it lies against the window (its bottom, in pixels from the window's top), and its data.
const block = (bottom = 900): RevealHost & { dataset: Record<string, string | undefined> } => ({
  dataset: {},
  getBoundingClientRect: () => ({ bottom }),
});

// The visitor's reduced motion setting, which can change during the visit.
const motion = (reduce = false) => {
  const listeners = new Set<(event: { matches: boolean }) => void>();
  return {
    matches: reduce,
    addEventListener: (_type: 'change', listener: (event: { matches: boolean }) => void) => listeners.add(listener),
    removeEventListener: (_type: 'change', listener: (event: { matches: boolean }) => void) => listeners.delete(listener),
    turn(reduce: boolean) {
      this.matches = reduce;
      for (const listener of [...listeners]) listener({ matches: reduce });
    },
    listeners,
  };
};

// The observer of the window: it reports the block's entries, until it is stopped.
const observer = () => {
  const state: { observing: boolean; report?: (entries: readonly Entry[]) => void } = { observing: false };
  return {
    state,
    observe: (report: (entries: readonly Entry[]) => void) => {
      state.observing = true;
      state.report = report;
      return () => {
        state.observing = false;
      };
    },
    // Each entry as the observer reports it: past the trigger line or not, and where the block's bottom lies.
    report(isIntersecting: boolean, bottom = 900) {
      if (state.observing) state.report?.([{ isIntersecting, boundingClientRect: { bottom } }]);
    },
  };
};

const played = (host: RevealHost) => () => {
  release(host);
};

describe('reveal: what arms', () => {
  it('arms a block below or in the window: its entry state is set by the script', () => {
    const host = block();
    const watch = observer();
    reveal(host, { motion: motion(), observe: watch.observe, play: played(host) });
    expect(host.dataset['armed']).toBe('');
    expect(watch.state.observing).toBe(true);
  });

  it('leaves a block whole and still under reduced motion', () => {
    const host = block();
    const watch = observer();
    reveal(host, { motion: motion(true), observe: watch.observe, play: played(host) });
    expect(host.dataset['armed']).toBeUndefined();
    expect(watch.state.observing).toBe(false);
  });

  it('leaves a block already above the window shown, without a move', () => {
    const host = block(0);
    const watch = observer();
    reveal(host, { motion: motion(), observe: watch.observe, play: played(host) });
    expect(host.dataset['armed']).toBeUndefined();
    expect(watch.state.observing).toBe(false);
  });
});

describe('reveal: when it plays', () => {
  it('waits while the block has not reached the trigger line', () => {
    const host = block();
    const watch = observer();
    let plays = 0;
    reveal(host, { motion: motion(), observe: watch.observe, play: () => (plays += 1) });
    watch.report(false);
    expect(plays).toBe(0);
    expect(host.dataset['armed']).toBe('');
  });

  it('plays once, as the block crosses the trigger line, then stops watching', () => {
    const host = block();
    const watch = observer();
    let plays = 0;
    reveal(host, {
      motion: motion(),
      observe: watch.observe,
      play: () => {
        plays += 1;
        release(host);
      },
    });
    watch.report(true, 600);
    watch.report(true, 500);
    expect(plays).toBe(1);
    expect(watch.state.observing).toBe(false);
    expect(host.dataset['armed']).toBeUndefined();
    expect(host.dataset['played']).toBe('');
  });

  it('shows without a move a block the window has jumped past (a reload mid-page, a link)', () => {
    const host = block();
    const watch = observer();
    let plays = 0;
    reveal(host, { motion: motion(), observe: watch.observe, play: () => (plays += 1) });
    watch.report(true, -200);
    expect(plays).toBe(0);
    expect(watch.state.observing).toBe(false);
    expect(host.dataset['armed']).toBeUndefined();
    expect(host.dataset['played']).toBeUndefined();
  });

  it('stops for good when the block leaves the page', () => {
    const host = block();
    const watch = observer();
    const settings = motion();
    let plays = 0;
    const stop = reveal(host, { motion: settings, observe: watch.observe, play: () => (plays += 1) });
    stop();
    watch.report(true);
    expect(plays).toBe(0);
    expect(settings.listeners.size).toBe(0);
  });
});

describe('reveal: reduced motion turned on during the visit', () => {
  it('shows a waiting block at once, still, and never plays it', () => {
    const host = block();
    const watch = observer();
    const settings = motion();
    let plays = 0;
    reveal(host, { motion: settings, observe: watch.observe, play: () => (plays += 1) });
    settings.turn(true);
    expect(host.dataset['armed']).toBeUndefined();
    expect(watch.state.observing).toBe(false);
    watch.report(true);
    expect(plays).toBe(0);
  });

  it('ignores reduced motion turned off', () => {
    const host = block();
    const watch = observer();
    const settings = motion();
    reveal(host, { motion: settings, observe: watch.observe, play: played(host) });
    settings.turn(false);
    expect(host.dataset['armed']).toBe('');
    expect(watch.state.observing).toBe(true);
  });

  it('no longer listens once the block has played', () => {
    const host = block();
    const watch = observer();
    const settings = motion();
    reveal(host, { motion: settings, observe: watch.observe, play: played(host) });
    watch.report(true);
    expect(settings.listeners.size).toBe(0);
  });
});

// The window as the observer sees it through a rootMargin (top right bottom left): a block crosses once its top is
// above the bottom edge, moved by the bottom margin, a percentage of the window's height.
const crosses = (margin: string, top: number, height: number) => {
  const [, , bottom = ''] = margin.split(' ');
  expect(bottom).toMatch(/^-?\d+(\.\d+)?%$/u);
  return top < height * (1 + Number.parseFloat(bottom) / 100);
};

describe('REVEAL_MARGIN', () => {
  it('plays a block once its top has risen past two thirds of the window', () => {
    expect(crosses(REVEAL_MARGIN, 700, 1000)).toBe(false);
    expect(crosses(REVEAL_MARGIN, 600, 1000)).toBe(true);
  });

  it('reaches far above the window, so that a block jumped past is reported', () => {
    const [top = ''] = REVEAL_MARGIN.split(' ');
    expect(Number.parseFloat(top)).toBeGreaterThanOrEqual(100000);
    expect(crosses(REVEAL_MARGIN, -50000, 1000)).toBe(true);
  });
});

describe('release', () => {
  it('lifts the entry state and marks the block as played, so that only a played block moves', () => {
    const host = block();
    host.dataset['armed'] = '';
    release(host);
    expect(host.dataset['armed']).toBeUndefined();
    expect(host.dataset['played']).toBe('');
  });
});
