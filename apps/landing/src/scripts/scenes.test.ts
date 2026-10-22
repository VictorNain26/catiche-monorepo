import { describe, expect, it } from 'bun:test';
import { afterHold, entered, Gestures, heldStep, left, request, sceneProgress, screenScale, scrollForStep, stepAt, stillScene } from './scenes';

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

// What the scene plays for a run of events: a step reached by the scroll, the text shown having left, the step
// reached having come in.
type Event = number | 'left' | 'entered';

const run = (from: number, events: readonly Event[]) => {
  let scene = stillScene(from);
  const played: string[] = [];
  for (const event of events) {
    const change = event === 'left' ? left(scene) : event === 'entered' ? { scene: entered(scene), finish: false } : request(scene, event);
    scene = change.scene;
    if (change.finish) played.push('finish');
    if (change.play) played.push(`${change.play.kind} ${String(change.play.step)} ${change.play.direction > 0 ? 'down' : 'up'}`);
  }
  return { played, scene };
};

describe('the change of step', () => {
  it('leaves the step shown, then comes into the step reached, down or up', () => {
    expect(run(1, [2, 'left', 'entered']).played).toEqual(['leave 1 down', 'enter 2 down']);
    expect(run(2, [0, 'left', 'entered']).played).toEqual(['leave 2 up', 'enter 0 up']);
    expect(run(1, [2, 'left', 'entered']).scene).toEqual(stillScene(2));
  });

  it('plays nothing for the step already shown, or already on its way', () => {
    expect(run(1, [1]).played).toEqual([]);
    expect(run(1, [2, 2, 2]).played).toEqual(['leave 1 down']);
  });

  it('goes straight to the last step reached by a fast scroll, never through the steps in between', () => {
    expect(run(0, [1, 2, 3, 'left', 'entered']).played).toEqual(['leave 0 down', 'enter 3 down']);
  });

  it('ends the coming in under way when the step reached changes, and leaves for the new one', () => {
    expect(run(0, [1, 'left', 3, 'left']).played).toEqual(['leave 0 down', 'enter 1 down', 'finish', 'leave 1 down', 'enter 3 down']);
  });

  it('comes back into the step it was leaving when the scroll turns back, the way it turned', () => {
    expect(run(1, [2, 1, 'left']).played).toEqual(['leave 1 down', 'enter 1 up']);
    expect(run(2, [1, 2, 'left']).played).toEqual(['leave 2 up', 'enter 2 down']);
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

describe('afterHold', () => {
  it('keeps the reading position the browser restored on a reload or a return', () => {
    expect(afterHold('reload', '')).toBe('position');
    expect(afterHold('back_forward', '#faq')).toBe('position');
  });

  it('brings back the target of the address on a new visit by a link to a section', () => {
    expect(afterHold('navigate', '#faq')).toBe('fragment');
    expect(afterHold(undefined, '#protection')).toBe('fragment');
  });

  it('leaves the page where it is on a new visit without a target', () => {
    expect(afterHold('navigate', '')).toBe('none');
    expect(afterHold('navigate', '#')).toBe('none');
  });
});

describe('Gestures', () => {
  const gestures = () => {
    const played: string[] = [];
    return { played, gestures: new Gestures<string>((gesture) => played.push(gesture)) };
  };

  it('waits while the scene is out of view, even for the step shown', () => {
    const { played, gestures: waiting } = gestures();
    waiting.wait(0, 'first');
    waiting.show(0);
    expect(played).toEqual([]);
  });

  it('plays the gestures of the step shown once the scene comes into view', () => {
    const { played, gestures: waiting } = gestures();
    waiting.wait(0, 'first');
    waiting.wait(1, 'second');
    waiting.show(0);
    waiting.see(true);
    expect(played).toEqual(['first']);
  });

  it('plays the gestures of a step as it is shown, while the scene is in view', () => {
    const { played, gestures: waiting } = gestures();
    waiting.wait(1, 'second');
    waiting.see(true);
    waiting.show(0);
    expect(played).toEqual([]);
    waiting.show(1);
    expect(played).toEqual(['second']);
  });

  it('plays nothing once the scene has left the view', () => {
    const { played, gestures: waiting } = gestures();
    waiting.wait(1, 'second');
    waiting.see(true);
    waiting.see(false);
    waiting.show(1);
    expect(played).toEqual([]);
  });

  it('forgets a gesture that no longer waits', () => {
    const { played, gestures: waiting } = gestures();
    const forget = waiting.wait(0, 'first');
    forget();
    waiting.show(0);
    waiting.see(true);
    expect(played).toEqual([]);
  });

  it('lets go of every gesture still waiting when the scene is released, and plays none of them itself', () => {
    const { played, gestures: waiting } = gestures();
    waiting.wait(0, 'first');
    waiting.wait(2, 'third');
    expect(waiting.release()).toEqual(['first', 'third']);
    waiting.show(0);
    waiting.see(true);
    expect(played).toEqual([]);
  });
});
