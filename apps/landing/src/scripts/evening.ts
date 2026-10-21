// The scenes of the evening play once, when they are read. Each one's HTML is its end state. Its entry state exists only
// while the element carries `data-armed`, which the script sets itself and takes off to play: if the script does not
// run, nothing waits for it. Durations and curve come from the tokens, through the computed style.

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
// Where the evening's screens become sticky (evening.astro): the observed element changes with it.
const wide = window.matchMedia('(width >= 64rem)');

class PlayOnce extends HTMLElement {
  #observer: IntersectionObserver | undefined;

  connectedCallback() {
    if (reducedMotion.matches) return;
    this.dataset['armed'] = '';
    this.#observe();
    wide.addEventListener('change', this.#observe);
    // Reduced motion turned on during the visit: everything shows, still.
    reducedMotion.addEventListener('change', this.#reveal);
  }

  disconnectedCallback() {
    this.#stop();
  }

  #observe = () => {
    this.#observer?.disconnect();
    // A sticky screen of the evening is always on screen, faded until its moment is read: it plays when the moment's
    // text crosses the middle of the window, rather than when it is itself in view.
    const moment = this.dataset['for'] ? document.getElementById(this.dataset['for']) : null;
    const sticky = getComputedStyle(this).position === 'sticky';
    const target = sticky && moment ? moment : this;
    this.#observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        this.#stop();
        this.play();
      },
      // A scene plays once its top has risen past the bottom fifth of the window, however tall it is.
      { rootMargin: sticky ? '-45% 0px -45% 0px' : '0px 0px -20% 0px' },
    );
    this.#observer.observe(target);
  };

  #reveal = (event: MediaQueryListEvent) => {
    if (!event.matches) return;
    this.#stop();
    delete this.dataset['armed'];
  };

  #stop() {
    this.#observer?.disconnect();
    wide.removeEventListener('change', this.#observe);
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
    // The same timing as the transitions that straighten the items (hero.astro).
    const timing = {
      duration: token('--duration-slow'),
      delay: token('--duration-wait'),
      easing: token('--ease-standard'),
      fill: 'backwards',
    } as const;
    items.forEach((item, index) => {
      const shift = (before[index] ?? 0) - item.getBoundingClientRect().top;
      item.animate([{ transform: `translateY(${String(shift)}px)` }, { transform: 'none' }], timing);
    });
  }
}

// A duration token in milliseconds, or the curve token as it is written.
function token(name: '--duration-slow' | '--duration-wait'): number;
function token(name: '--ease-standard'): string;
function token(name: string): number | string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!name.startsWith('--duration')) return value;
  return value.endsWith('ms') ? parseFloat(value) : parseFloat(value) * 1000;
}

customElements.define('play-once', PlayOnce);
customElements.define('tonight-order', TonightOrder);
