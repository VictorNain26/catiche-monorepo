import { describe, expect, it } from 'bun:test';
import { heldStep, nextMove, sceneProgress, screenScale, scrollForStep, stepAt } from './scenes';

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

describe('heldStep', () => {
  // Four steps: each holds a quarter of the progress; 10 % of a quarter is 0.025.
  it('picks the step of the progress when none is shown yet', () => {
    expect(heldStep(0.3, 4, undefined)).toBe(1);
  });

  it('keeps the step shown a little past its edges, so that it does not flicker at a boundary', () => {
    expect(heldStep(0.26, 4, 0)).toBe(0);
    expect(heldStep(0.27, 4, 0)).toBe(0);
    expect(heldStep(0.24, 4, 1)).toBe(1);
    expect(heldStep(0.23, 4, 1)).toBe(1);
  });

  it('moves on once the progress is clearly in another step', () => {
    expect(heldStep(0.28, 4, 0)).toBe(1);
    expect(heldStep(0.22, 4, 1)).toBe(0);
  });

  it('jumps straight to a far step', () => {
    expect(heldStep(0.9, 4, 0)).toBe(3);
  });
});

describe('nextMove', () => {
  it('does nothing while the step reached is the one shown, or the one already on its way', () => {
    expect(nextMove({ shown: 1, heading: 1 }, 1)).toBeUndefined();
    expect(nextMove({ shown: 1, heading: 2 }, 2)).toBeUndefined();
  });

  it('goes from the step shown to the step reached, down or up', () => {
    expect(nextMove({ shown: 1, heading: 1 }, 2)).toEqual({ from: 1, to: 2, direction: 1 });
    expect(nextMove({ shown: 2, heading: 2 }, 0)).toEqual({ from: 2, to: 0, direction: -1 });
  });

  it('skips the steps in between when the scroll runs past them, from the step still shown', () => {
    expect(nextMove({ shown: 0, heading: 1 }, 3)).toEqual({ from: 0, to: 3, direction: 1 });
  });

  it('comes back to the step shown when the scroll turns back while it leaves', () => {
    expect(nextMove({ shown: 1, heading: 2 }, 1)).toEqual({ from: 1, to: 1, direction: -1 });
    expect(nextMove({ shown: 2, heading: 1 }, 2)).toEqual({ from: 2, to: 2, direction: 1 });
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
