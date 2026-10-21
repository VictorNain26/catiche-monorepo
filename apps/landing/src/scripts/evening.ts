// The scenes of the evening play once, when they are read. Each one's HTML is its end state. Its entry state exists only
// while the element carries `data-armed`, which the script sets itself and takes off to play: if the script does not
// run, nothing waits for it. Durations and curve come from the tokens, through the computed style.

import { orderTiming } from './timing';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
// Taller than the page: what lies above the window counts as read.
const ABOVE = '100000px';

class PlayOnce extends HTMLElement {
  #observer: IntersectionObserver | undefined;

  connectedCallback() {
    if (reducedMotion.matches) return;
    this.dataset['armed'] = '';
    // The entry state is computed now, before the observer can play the scene: a scene already in view on load (the top
    // of the page, an arrival on an anchor) then plays from it rather than from its end state. Its CSS sets it at once,
    // without a transition.
    this.getBoundingClientRect();
    // A scene plays once its top has risen past the bottom fifth of the window, however tall it is. The band reaches far
    // above the window: a scene already scrolled past, on load or by a jump to a link, plays too, rather than staying in
    // its entry state.
    this.#observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        this.#stop();
        this.play();
      },
      { rootMargin: `${ABOVE} 0px -20% 0px` },
    );
    this.#observer.observe(this);
    // Reduced motion turned on during the visit: everything shows, still.
    reducedMotion.addEventListener('change', this.#reveal);
  }

  disconnectedCallback() {
    this.#stop();
  }

  #reveal = (event: MediaQueryListEvent) => {
    if (!event.matches) return;
    this.#stop();
    delete this.dataset['armed'];
  };

  #stop() {
    this.#observer?.disconnect();
    reducedMotion.removeEventListener('change', this.#reveal);
  }

  play() {
    delete this.dataset['armed'];
  }
}

// From the jumble to Tom's order: each item leaves the place it was said in for its place in the order (FLIP).
class TonightOrder extends PlayOnce {
  override play() {
    const items = [...this.querySelectorAll<HTMLElement>('[data-spoken]')];
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
