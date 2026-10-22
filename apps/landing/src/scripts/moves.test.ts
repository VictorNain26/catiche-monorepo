import { describe, expect, it } from 'bun:test';
import { flipShift, type Move, Moves, ownMoves } from './moves';

// An animation as Web Animations runs it: running until it is finished or cancelled; its `finished` promise settles
// then, a cancel rejecting it, as the browser does.
const animation = () => {
  let settle: { resolve: () => void; reject: (error: Error) => void } | undefined;
  const finished = new Promise<void>((resolve, reject) => {
    settle = { resolve, reject };
  });
  finished.catch(() => undefined);
  const move = {
    playState: 'running' as AnimationPlayState,
    finished,
    finishes: 0,
    cancel() {
      move.playState = 'idle';
      settle?.reject(new Error('AbortError'));
    },
    finish() {
      move.finishes += 1;
      move.playState = 'finished';
      settle?.resolve();
    },
  };
  return move satisfies Move;
};
type Fake = ReturnType<typeof animation>;

// The promises settle in a later microtask.
const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Moves', () => {
  it('ends the moves under way at once', () => {
    const moves = new Moves<Fake>();
    const [a, b] = [moves.add(animation()), moves.add(animation())];
    moves.finish();
    expect([a.finishes, b.finishes]).toEqual([1, 1]);
  });

  it('forgets a move once it has finished', async () => {
    const moves = new Moves<Fake>();
    const a = moves.add(animation());
    a.finish();
    await settled();
    expect(moves.under((move) => move === a)).toEqual([]);
  });

  it('forgets a cancelled move, so that a later finish never plays it to its end', async () => {
    const moves = new Moves<Fake>();
    const a = moves.add(animation());
    a.cancel();
    await settled();
    moves.finish();
    expect(a.finishes).toBe(0);
  });

  it('never ends a move cancelled in the same frame, before its promise settles', () => {
    const moves = new Moves<Fake>();
    const a = moves.add(animation());
    a.cancel();
    moves.finish();
    expect(a.finishes).toBe(0);
  });

  it('gives only the moves under way, so that a coming in waits for none that was cancelled', () => {
    const moves = new Moves<Fake>();
    const [a, b] = [moves.add(animation()), moves.add(animation())];
    a.cancel();
    expect(moves.under(() => true)).toEqual([b]);
  });

  it('cancels every move under way', () => {
    const moves = new Moves<Fake>();
    const a = moves.add(animation());
    moves.cancel();
    expect(a.playState).toBe('idle');
    expect(moves.under(() => true)).toEqual([]);
  });
});

describe('ownMoves', () => {
  // What `getAnimations()` gives on a step: the script's moves, and the animations and transitions of the CSS.
  const script = { id: 'script' };
  const cssAnimation = { id: 'animation', animationName: 'strike-through' };
  const cssTransition = { id: 'transition', transitionProperty: 'opacity' };

  it('keeps the moves of the script, never an animation or a transition of the CSS', () => {
    expect(ownMoves([cssAnimation, script, cssTransition])).toEqual([script]);
  });

  it('gives none when there are only those of the CSS', () => {
    expect(ownMoves([cssAnimation, cssTransition])).toEqual([]);
  });
});

describe('flipShift', () => {
  it('moves an item back to the place it had, by the distance between its two places', () => {
    expect(flipShift(100, 160, 1)).toBe(-60);
    expect(flipShift(200, 120, 1)).toBe(80);
  });

  it('divides that distance by the zoom of a screen shrunk to fit, whose own pixels are smaller', () => {
    expect(flipShift(100, 160, 0.75)).toBe(-80);
  });

  it('keeps the distance as it is when the zoom cannot be read', () => {
    expect(flipShift(100, 160, 0)).toBe(-60);
    expect(flipShift(100, 160, Number.NaN)).toBe(-60);
  });
});
