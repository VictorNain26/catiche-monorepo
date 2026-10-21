import { describe, expect, it } from 'bun:test';
import { CLOCK_MINUTES, clockMinute, clockTime } from './clock';

// A window 900 px high under a header 64 px high: the clock starts where a block plays (two thirds of the window, 600 px)
// and stops when the title reaches the header.
const view = { height: 900, offset: 64 };

describe('clockMinute', () => {
  it('stays at 17:30 while the title is still below the line where it appears', () => {
    expect(clockMinute(900, view, 0)).toBe(0);
    expect(clockMinute(600, view, 0)).toBe(0);
  });

  it('moves a minute at a time as the title rises', () => {
    expect(clockMinute(332, view, 0)).toBe(15);
    expect(clockMinute(331, view, 0)).toBe(15);
    expect(clockMinute(583, view, 0)).toBe(0);
    expect(clockMinute(582, view, 0)).toBe(1);
  });

  it('stops at 18:00 once the title reaches the header, and past it', () => {
    expect(clockMinute(64, view, 0)).toBe(CLOCK_MINUTES);
    expect(clockMinute(-2000, view, 0)).toBe(CLOCK_MINUTES);
  });

  it('never goes back when the page is scrolled up', () => {
    expect(clockMinute(900, view, 20)).toBe(20);
    expect(clockMinute(332, view, 20)).toBe(20);
  });

  it('stays still in a window too short to have room between the line and the header', () => {
    expect(clockMinute(10, { height: 90, offset: 64 }, 0)).toBe(CLOCK_MINUTES);
    expect(clockMinute(80, { height: 90, offset: 64 }, 0)).toBe(0);
  });
});

describe('clockTime', () => {
  it('writes the hour reached the French way, from 17 h 30 to 18 h', () => {
    expect(clockTime(0)).toBe('17 h 30');
    expect(clockTime(1)).toBe('17 h 31');
    expect(clockTime(29)).toBe('17 h 59');
    expect(clockTime(CLOCK_MINUTES)).toBe('18 h');
  });

  it('never leaves the half hour', () => {
    expect(clockTime(-5)).toBe('17 h 30');
    expect(clockTime(45)).toBe('18 h');
  });
});
