// The moves the evening's script plays in Web Animations (src/scripts/evening.ts), told apart from the CSS's own
// animations and transitions. Pure, so that it is tested.

/** A move of the script, as Web Animations runs it. */
export interface Move {
  readonly playState: AnimationPlayState;
  readonly finished: Promise<unknown>;
  cancel(): void;
  finish(): void;
}

/** The moves under way. A move leaves the list once it has finished or been cancelled, and a cancelled move is never
 * ended later: `finish()` would play it to its end state, and a text held on its exit would vanish at once. */
export class Moves<M extends Move = Move> {
  #list: M[] = [];

  add(move: M): M {
    this.#list.push(move);
    const drop = () => {
      this.#list = this.#list.filter((other) => other !== move);
    };
    move.finished.then(drop, drop);
    return move;
  }

  /** The moves under way that the predicate keeps: none cancelled in the meantime. */
  under(predicate: (move: M) => boolean): M[] {
    return this.#list.filter((move) => move.playState !== 'idle' && predicate(move));
  }

  /** Ends the moves under way at once. */
  finish(): void {
    for (const move of this.#take()) move.finish();
  }

  /** Cancels the moves under way: their elements are shown by their own style again. */
  cancel(): void {
    for (const move of this.#take()) move.cancel();
  }

  #take(): M[] {
    const moves = this.#list.filter((move) => move.playState !== 'idle');
    this.#list = [];
    return moves;
  }
}

/** Among an element's animations, the script's own: a CSSAnimation has its `animationName`, a CSSTransition its
 * `transitionProperty`, and those belong to the CSS, which plays and ends them itself. */
export function ownMoves<A extends object>(animations: Iterable<A>): A[] {
  return [...animations].filter((animation) => !('animationName' in animation) && !('transitionProperty' in animation));
}

/** How far an item moves back to the place it had (FLIP), in its own pixels: the window's distance between its two
 * places, divided by the zoom of a screen shrunk to fit (`currentCSSZoom`), whose pixels are smaller. */
export function flipShift(before: number, after: number, zoom: number): number {
  const shift = before - after;
  return zoom > 0 ? shift / zoom : shift;
}
