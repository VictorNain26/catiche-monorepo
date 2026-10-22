// The evening held while it is scrolled (sections/evening.astro): its track is several windows high, and its scene stays
// under the header while the track passes; how far the track has passed picks the step shown. Pure, so that it is tested.

/** Where the track lies against the window (`getBoundingClientRect`): its top, and its height. */
export interface Track {
  readonly top: number;
  readonly height: number;
}

/** The window's height, and the header's, under which the scene is held. */
export interface View {
  readonly height: number;
  readonly offset: number;
}

const clamp = (value: number) => Math.min(1, Math.max(0, value));

/** How far the held scene has gone, from 0 when the track reaches the header to 1 when its end leaves the scene. */
export function sceneProgress(track: Track, view: View): number {
  const travel = track.height - (view.height - view.offset);
  const passed = view.offset - track.top;
  if (travel <= 0) return passed >= 0 ? 1 : 0;
  return clamp(passed / travel);
}

/** The step shown: each step holds an equal share of the progress. */
export function stepAt(progress: number, count: number): number {
  return Math.min(count - 1, Math.floor(clamp(progress) * count));
}

// How far past its edges the step shown holds, in a share of a step: it does not flicker at a boundary.
const HYSTERESIS = 0.1;

/** The step to show for the progress, the step shown kept a little past its edges. */
export function heldStep(progress: number, count: number, shown: number | undefined): number {
  const step = stepAt(progress, count);
  if (shown === undefined || step === shown) return step;
  const share = 1 / count;
  const lower = (shown - HYSTERESIS) * share;
  const upper = (shown + 1 + HYSTERESIS) * share;
  return progress >= lower && progress < upper ? shown : step;
}

/** The held scene between two steps: the step shown, the step it heads to, whether the step shown is still, leaving
 * or coming in, and the way the scroll went, down (1) or up (-1). */
export interface Scene {
  readonly shown: number;
  readonly heading: number;
  readonly phase: 'still' | 'leaving' | 'entering';
  readonly direction: 1 | -1;
}

/** What the scene plays: a step that leaves or comes in, and the way it goes. */
export interface Play {
  readonly kind: 'leave' | 'enter';
  readonly step: number;
  readonly direction: 1 | -1;
}

/** A change of the scene: the scene after it, whether the moves under way end at once, and what then plays. */
export interface Change {
  readonly scene: Scene;
  readonly finish: boolean;
  readonly play?: Play;
}

export function stillScene(step: number): Scene {
  return { shown: step, heading: step, phase: 'still', direction: 1 };
}

const way = (from: number, to: number): 1 | -1 => (to >= from ? 1 : -1);

/** A step reached by the scroll. While the step shown leaves, the scene only heads elsewhere: whatever the scroll runs
 * past in the meantime is never played. While a step comes in, it ends at once and leaves for the new one. */
export function request(scene: Scene, target: number): Change {
  if (target === scene.heading) return { scene, finish: false };
  if (scene.phase === 'leaving') return { scene: { ...scene, heading: target }, finish: false };
  const direction = way(scene.shown, target);
  return {
    scene: { shown: scene.shown, heading: target, phase: 'leaving', direction },
    finish: scene.phase === 'entering',
    play: { kind: 'leave', step: scene.shown, direction },
  };
}

/** The text shown has left: the step the scene heads to comes in, the way the scroll went; back into the step it was
 * leaving, the way the scroll turned. */
export function left(scene: Scene): Change {
  const direction = scene.heading === scene.shown ? (-scene.direction as 1 | -1) : way(scene.shown, scene.heading);
  return {
    scene: { shown: scene.heading, heading: scene.heading, phase: 'entering', direction },
    finish: false,
    play: { kind: 'enter', step: scene.heading, direction },
  };
}

/** The step reached has come in. */
export function entered(scene: Scene): Scene {
  return { ...scene, phase: 'still' };
}

/** The page's scroll position that shows a step, in the middle of its share: where the keyboard's focus, gone into a
 * step that is not shown, brings the window (src/scripts/evening.ts), and where an hour of the timeline does. `track.top`
 * is the track's top in the page. */
export function scrollForStep(step: number, count: number, track: Track, view: View): number {
  const travel = Math.max(0, track.height - (view.height - view.offset));
  return track.top - view.offset + ((step + 0.5) / count) * travel;
}

/** What follows the hold of the scene, which makes its track several windows high: on a reload or a return, the reading
 * position the browser restored, which is the held scene's own (`position`); on a visit by a link to a section, its
 * target, which the track's growth has moved (`fragment`); otherwise nothing. `navigation` is the navigation's type
 * (`PerformanceNavigationTiming.type`), `hash` the address's fragment. */
export function afterHold(navigation: string | undefined, hash: string): 'position' | 'fragment' | 'none' {
  if (navigation === 'reload' || navigation === 'back_forward') return 'position';
  return hash.length > 1 ? 'fragment' : 'none';
}

/** The gestures of the held scene's steps (a screen's messages, the order that falls into place): each one waits for its
 * step to be shown while the scene is in view, then plays, once. */
export class Gestures<G> {
  readonly #play: (gesture: G) => void;
  readonly #waiting = new Map<number, Set<G>>();
  #shown: number | undefined;
  #inView = false;

  constructor(play: (gesture: G) => void) {
    this.#play = play;
  }

  /** A gesture of a step waits; returns how to forget it. */
  wait(step: number, gesture: G): () => void {
    const waiting = this.#waiting.get(step) ?? new Set<G>();
    waiting.add(gesture);
    this.#waiting.set(step, waiting);
    return () => {
      waiting.delete(gesture);
    };
  }

  /** The step shown on the scene. */
  show(step: number): void {
    this.#shown = step;
    this.#flush();
  }

  /** Whether the scene is in view. */
  see(inView: boolean): void {
    this.#inView = inView;
    this.#flush();
  }

  /** The scene lets go: the gestures still waiting are given back, and none waits here any more. */
  release(): G[] {
    const waiting = [...this.#waiting.values()].flatMap((gestures) => [...gestures]);
    this.#waiting.clear();
    return waiting;
  }

  #flush() {
    if (!this.#inView || this.#shown === undefined) return;
    for (const gesture of [...(this.#waiting.get(this.#shown) ?? [])]) this.#play(gesture);
  }
}

/** How much a step's screen shrinks to fit the room its text leaves it: not at all if it fits, never past `minimum`,
 * below which the step is no longer read whole (none: the scene is then not held). */
export function screenScale(available: number, natural: number, minimum: number): number | undefined {
  if (natural <= available) return 1;
  const scale = available / natural;
  return scale >= minimum ? scale : undefined;
}
