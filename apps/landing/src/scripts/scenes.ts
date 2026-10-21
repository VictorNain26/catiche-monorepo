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

/** A change of step: from the step still shown to the one reached, down (1) or up (-1). */
export interface Move {
  readonly from: number;
  readonly to: number;
  readonly direction: 1 | -1;
}

/** The change a reached step asks for, the step shown and the one the scene is heading to being known: none if it is
 * already on its way; the steps in between are skipped. Back to the step shown while it leaves, it comes back the way
 * the scroll turned. */
export function nextMove({ shown, heading }: { shown: number; heading: number }, target: number): Move | undefined {
  if (target === heading) return undefined;
  const towards = target === shown ? shown - heading : target - shown;
  return { from: shown, to: target, direction: towards > 0 ? 1 : -1 };
}

/** The page's scroll position that shows a step, in the middle of its share: where a focused link of that step brings
 * the window. `track.top` is the track's top in the page. */
export function scrollForStep(step: number, count: number, track: Track, view: View): number {
  const travel = Math.max(0, track.height - (view.height - view.offset));
  return track.top - view.offset + ((step + 0.5) / count) * travel;
}

/** How much a step's screen shrinks to fit the room its text leaves it: not at all if it fits, never past `minimum`,
 * below which the step is no longer read whole (none: the scene is then not held). */
export function screenScale(available: number, natural: number, minimum: number): number | undefined {
  if (natural <= available) return 1;
  const scale = available / natural;
  return scale >= minimum ? scale : undefined;
}
