// The blocks of the page play once, when they are read (src/scripts/reveal.ts). Durations and curve come from the tokens,
// through the computed style.

import { release, REVEAL_MARGIN, reveal } from './reveal';
import { orderTiming } from './timing';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

class PlayOnce extends HTMLElement {
  #stop: (() => void) | undefined;

  connectedCallback() {
    this.#stop = reveal(this, {
      motion: reducedMotion,
      observe: (report) => {
        const observer = new IntersectionObserver(report, { rootMargin: REVEAL_MARGIN });
        observer.observe(this);
        return () => {
          observer.disconnect();
        };
      },
      play: () => {
        this.play();
      },
    });
  }

  disconnectedCallback() {
    this.#stop?.();
  }

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
    const timing = orderTiming(getComputedStyle(document.documentElement));
    // A token that cannot be read leaves the order as it is, without a move.
    if (!timing) return;
    items.forEach((item, index) => {
      const shift = (before[index] ?? 0) - item.getBoundingClientRect().top;
      item.animate([{ transform: `translateY(${String(shift)}px)` }, { transform: 'none' }], timing);
    });
  }
}

customElements.define('play-once', PlayOnce);
customElements.define('tonight-order', TonightOrder);
