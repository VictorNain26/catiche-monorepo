// The blocks of the page play once, when they are read (src/scripts/reveal.ts); a block of a step of the held evening
// waits for its step (src/scripts/evening.ts). Durations and curves come from the tokens, through the computed style.

import { flipShift } from './moves';
import { type Entry, release, REVEAL_MARGIN, reveal } from './reveal';
import { orderTiming } from './timing';

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

export type Report = (entries: readonly Entry[]) => void;

export class PlayOnce extends HTMLElement {
  #stop: (() => void) | undefined;

  connectedCallback() {
    // A block of a step of the held evening plays when its step is shown: its scene starts it (`evening-scenes`).
    if (this.closest('evening-scenes [data-step]')) return;
    this.start(this.inView);
  }

  disconnectedCallback() {
    this.#stop?.();
  }

  // Arms the block and plays it once `observe` reports it read.
  start(observe: (report: Report) => () => void) {
    this.#stop = reveal(this, {
      motion: reducedMotion,
      observe,
      play: () => {
        this.play();
      },
    });
  }

  // A block that waited for its step, once the scene lets go of it: it plays as any other, once read (`inView`).
  watch() {
    this.#stop?.();
    delete this.dataset['armed'];
    this.start(this.inView);
  }

  // Read once it has risen into the window.
  readonly inView = (report: Report) => {
    const observer = new IntersectionObserver(report, { rootMargin: REVEAL_MARGIN });
    observer.observe(this);
    return () => {
      observer.disconnect();
    };
  };

  play() {
    release(this);
  }
}

// From the order before to the order now: each item leaves the place it had for its place in the order (FLIP), by
// `data-before`.
class TonightOrder extends PlayOnce {
  override play() {
    const items = [...this.querySelectorAll<HTMLElement>('[data-before]')];
    const before = items.map((item) => item.getBoundingClientRect().top);
    super.play();
    const timing = orderTiming(getComputedStyle(this));
    // A token that cannot be read leaves the order as it is, without a move.
    if (!timing) return;
    items.forEach((item, index) => {
      const shift = flipShift(before[index] ?? 0, item.getBoundingClientRect().top, item.currentCSSZoom);
      item.animate([{ transform: `translateY(${String(shift)}px)` }, { transform: 'none' }], timing);
    });
  }
}

customElements.define('play-once', PlayOnce);
customElements.define('tonight-order', TonightOrder);
