// A block that plays once, when it is read (.claude/rules/landing.md). Its HTML is its end state. Its entry state exists
// only while it carries `data-armed`, which this script sets itself, outside reduced motion; it moves only once it
// carries `data-played` (src/styles/global.css). If the script does not run, nothing waits for it; a block the window
// has jumped past shows at once, without a move.

// What the observer of the window reports: whether the block has crossed the trigger line, and where it lies.
export interface Entry {
  readonly isIntersecting: boolean;
  readonly boundingClientRect: { readonly bottom: number };
}

export interface RevealHost {
  readonly dataset: Record<string, string | undefined>;
  getBoundingClientRect(): { readonly bottom: number };
}

interface Motion {
  readonly matches: boolean;
  addEventListener(type: 'change', listener: (event: { matches: boolean }) => void): void;
  removeEventListener(type: 'change', listener: (event: { matches: boolean }) => void): void;
}

interface Reveal {
  // `prefers-reduced-motion: reduce`.
  readonly motion: Motion;
  // Starts watching the block, reports its entries, and returns how to stop.
  readonly observe: (report: (entries: readonly Entry[]) => void) => () => void;
  // Plays the block: at least `release` it.
  readonly play: () => void;
}

// The block plays: its entry state lifts, and its transitions apply.
export function release(host: RevealHost): void {
  host.dataset['played'] = '';
  delete host.dataset['armed'];
}

// Arms the block and plays it once it is read; returns how to stop watching it.
export function reveal(host: RevealHost, { motion, observe, play }: Reveal): () => void {
  // Under reduced motion, or already above the window (a reload mid-page): the block stays as its HTML shows it.
  if (motion.matches || host.getBoundingClientRect().bottom <= 0) return () => undefined;
  host.dataset['armed'] = '';
  // The entry state is computed now, before the observer can play the block: a block already in view then plays from it
  // rather than from its end state.
  host.getBoundingClientRect();

  // The observer and the setting report later, never while they are being set up.
  const unobserve = observe((entries) => {
    const entry = entries.at(-1);
    if (!entry?.isIntersecting) return;
    stop();
    // Crossed by a jump (the browser restoring the reading position, a link): shown at once, without a move.
    if (entry.boundingClientRect.bottom <= 0) delete host.dataset['armed'];
    else play();
  });
  // Reduced motion turned on during the visit: everything shows, still.
  const onMotion = (event: { matches: boolean }) => {
    if (!event.matches) return;
    stop();
    delete host.dataset['armed'];
  };
  motion.addEventListener('change', onMotion);
  function stop() {
    unobserve();
    motion.removeEventListener('change', onMotion);
  }
  return stop;
}
