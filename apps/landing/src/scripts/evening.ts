// The scenes of the evening play once, when they are read. Each one's HTML is its end state; its entry state
// exists only under `@media (scripting: enabled) and (prefers-reduced-motion: no-preference)`, in its component's
// style, and `data-played` lets it go. Durations and curve come from the tokens, through the computed style.

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

class PlayOnce extends HTMLElement {
  connectedCallback() {
    if (reducedMotion) return;
    // A sticky screen of the evening is always on screen, faded until its moment is read: it plays when the
    // moment's text crosses the middle of the window, rather than when it is itself in view.
    const moment = this.dataset['for'] ? document.getElementById(this.dataset['for']) : null;
    const sticky = getComputedStyle(this).position === 'sticky';
    const target = sticky && moment ? moment : this;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        this.play();
      },
      sticky ? { rootMargin: '-45% 0px -45% 0px' } : { threshold: 0.6 },
    );
    observer.observe(target);
  }

  play() {
    this.dataset['played'] = '';
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
