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
