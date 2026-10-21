import { describe, expect, it } from 'bun:test';
import { arrivalEnded, inView, milliseconds, orderDelay, orderTiming, sceneTiming } from './timing';

describe('milliseconds', () => {
  it('reads a duration in milliseconds or in seconds', () => {
    expect(milliseconds('400ms')).toBe(400);
    expect(milliseconds('0.4s')).toBe(400);
    expect(milliseconds('1s')).toBe(1000);
    expect(milliseconds('.25s')).toBe(250);
  });

  it('reads a computed custom property, spaces around it included', () => {
    expect(milliseconds(' 1000ms ')).toBe(1000);
  });

  it('reads its unit whatever its case, as CSS does', () => {
    expect(milliseconds('400MS')).toBe(400);
    expect(milliseconds('0.4S')).toBe(400);
  });

  it('reads nothing from an empty or missing token', () => {
    expect(milliseconds('')).toBeUndefined();
    expect(milliseconds('   ')).toBeUndefined();
  });

  it('reads nothing from what is not a duration', () => {
    expect(milliseconds('slow')).toBeUndefined();
    expect(milliseconds('ms')).toBeUndefined();
    expect(milliseconds('400')).toBeUndefined();
    expect(milliseconds('400px')).toBeUndefined();
    expect(milliseconds('400ms 200ms')).toBeUndefined();
  });
});

const tokens = (values: Record<string, string>) => ({
  getPropertyValue: (name: string) => values[name] ?? '',
});

// `--order-delay` is registered as a <time>: the computed style gives it resolved, in seconds.
const TOKENS = { '--duration-slow': '400ms', '--order-delay': '1.02s', '--ease-standard': ' cubic-bezier(0.2, 0, 0, 1)' };

describe('orderTiming', () => {
  it("times the move from the tokens, held on its start until the order's own delay", () => {
    expect(orderTiming(tokens(TOKENS))).toEqual({ duration: 400, delay: 1020, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'backwards' });
  });

  it('gives no timing when a token is missing', () => {
    for (const missing of Object.keys(TOKENS)) {
      expect(orderTiming(tokens({ ...TOKENS, [missing]: '' }))).toBeUndefined();
    }
  });

  it('gives no timing when a duration cannot be read', () => {
    expect(orderTiming(tokens({ ...TOKENS, '--duration-slow': 'slow' }))).toBeUndefined();
    expect(orderTiming(tokens({ ...TOKENS, '--order-delay': '1000' }))).toBeUndefined();
  });
});

describe('sceneTiming', () => {
  const SCENE = {
    '--duration-fast': '150ms',
    '--duration-base': '250ms',
    '--duration-slow': '400ms',
    '--duration-stagger': '120ms',
    '--ease-exit': ' cubic-bezier(0.4, 0, 1, 1)',
    '--ease-out-expo': ' cubic-bezier(0.19, 1, 0.22, 1)',
  };

  it('reads the durations and the two curves of a change of step', () => {
    expect(sceneTiming(tokens(SCENE))).toEqual({
      fast: 150,
      base: 250,
      slow: 400,
      stagger: 120,
      exit: 'cubic-bezier(0.4, 0, 1, 1)',
      enter: 'cubic-bezier(0.19, 1, 0.22, 1)',
    });
  });

  it('gives no timing when a token is missing or not a duration: the steps then change without a move', () => {
    for (const missing of Object.keys(SCENE)) {
      expect(sceneTiming(tokens({ ...SCENE, [missing]: '' }))).toBeUndefined();
    }
    expect(sceneTiming(tokens({ ...SCENE, '--duration-slow': 'slow' }))).toBeUndefined();
  });
});

describe('inView', () => {
  it('sees Tom once half of him is in the window', () => {
    expect(inView({ isIntersecting: true, intersectionRatio: 0.5 })).toBe(true);
    expect(inView({ isIntersecting: true, intersectionRatio: 1 })).toBe(true);
  });

  it('waits while less than half of him is in the window', () => {
    expect(inView({ isIntersecting: true, intersectionRatio: 0.49 })).toBe(false);
  });

  it('waits while he is out of the window', () => {
    expect(inView({ isIntersecting: false, intersectionRatio: 0 })).toBe(false);
  });
});

describe('orderDelay', () => {
  it("reads the order's own delay, in milliseconds or in seconds", () => {
    expect(orderDelay(tokens({ '--order-delay': '900ms' }))).toBe(900);
    expect(orderDelay(tokens({ '--order-delay': '1.02s' }))).toBe(1020);
  });

  it('reads no delay when the order has none', () => {
    expect(orderDelay(tokens({}))).toBeUndefined();
  });

  it('reads no delay from a value that is not a time', () => {
    expect(orderDelay(tokens({ '--order-delay': 'calc(var(--duration-stagger) + var(--duration-reveal))' }))).toBeUndefined();
    expect(orderDelay(tokens({ '--order-delay': '900' }))).toBeUndefined();
  });
});

describe('arrivalEnded', () => {
  const host = {};

  it('ends with the arrival of the element that arrives itself', () => {
    expect(arrivalEnded({ target: host, propertyName: 'translate' }, host)).toBe(true);
  });

  it('waits past the end of another property of that element', () => {
    expect(arrivalEnded({ target: host, propertyName: 'opacity' }, host)).toBe(false);
  });

  it('waits past a transition that bubbles up from inside it', () => {
    expect(arrivalEnded({ target: {}, propertyName: 'translate' }, host)).toBe(false);
  });
});
