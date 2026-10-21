import { describe, expect, it } from 'bun:test';
import { sceneProgress, screenScale, scrollForStep, stepAt } from './scenes';

// A window 800 px high under a header of 64 px: the scene, held under the header, is 736 px high. The track around it
// is four windows high, so the scene stays held over 3200 - 736 = 2464 px of scrolling.
const VIEW = { height: 800, offset: 64 };
const HEIGHT = 3200;
const TRAVEL = HEIGHT - (VIEW.height - VIEW.offset);

describe('sceneProgress', () => {
  it('is 0 while the track has not reached the header', () => {
    expect(sceneProgress({ top: 500, height: HEIGHT }, VIEW)).toBe(0);
    expect(sceneProgress({ top: VIEW.offset, height: HEIGHT }, VIEW)).toBe(0);
  });

  it('runs from 0 to 1 while the scene is held', () => {
    expect(sceneProgress({ top: VIEW.offset - TRAVEL / 4, height: HEIGHT }, VIEW)).toBeCloseTo(0.25);
    expect(sceneProgress({ top: VIEW.offset - TRAVEL / 2, height: HEIGHT }, VIEW)).toBeCloseTo(0.5);
  });

  it('is 1 once the track has scrolled past', () => {
    expect(sceneProgress({ top: VIEW.offset - TRAVEL, height: HEIGHT }, VIEW)).toBe(1);
    expect(sceneProgress({ top: -10000, height: HEIGHT }, VIEW)).toBe(1);
  });

  it('jumps from 0 to 1 when the track is no taller than the scene', () => {
    expect(sceneProgress({ top: 100, height: 700 }, VIEW)).toBe(0);
    expect(sceneProgress({ top: 0, height: 700 }, VIEW)).toBe(1);
  });
});

describe('stepAt', () => {
  it('gives each of four steps a quarter of the progress', () => {
    expect([0, 0.24, 0.25, 0.49, 0.5, 0.74, 0.75, 0.99].map((progress) => stepAt(progress, 4))).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });

  it('keeps the last step at the end, and the first before the start', () => {
    expect(stepAt(1, 4)).toBe(3);
    expect(stepAt(1.2, 4)).toBe(3);
    expect(stepAt(-0.1, 4)).toBe(0);
  });
});

describe('scrollForStep', () => {
  // The track starts 2000 px down the page.
  const track = { top: 2000, height: HEIGHT };

  it('scrolls to the middle of the step, where it is shown', () => {
    for (const step of [0, 1, 2, 3]) {
      const scrollY = scrollForStep(step, 4, track, VIEW);
      expect(stepAt(sceneProgress({ top: track.top - scrollY, height: HEIGHT }, VIEW), 4)).toBe(step);
    }
  });

  it('places the first step a few pixels into the held scene, and the last before its end', () => {
    expect(scrollForStep(0, 4, track, VIEW)).toBeCloseTo(track.top - VIEW.offset + TRAVEL / 8);
    expect(scrollForStep(3, 4, track, VIEW)).toBeCloseTo(track.top - VIEW.offset + (TRAVEL * 7) / 8);
  });
});

describe('screenScale', () => {
  it('keeps a screen that fits at its size', () => {
    expect(screenScale(400, 300, 0.7)).toBe(1);
    expect(screenScale(300, 300, 0.7)).toBe(1);
  });

  it('shrinks a screen that does not fit to the room left', () => {
    expect(screenScale(300, 400, 0.7)).toBe(0.75);
  });

  it('gives no scale when the screen would shrink past the smallest readable size', () => {
    expect(screenScale(200, 400, 0.7)).toBeUndefined();
    expect(screenScale(0, 400, 0.7)).toBeUndefined();
  });
});
