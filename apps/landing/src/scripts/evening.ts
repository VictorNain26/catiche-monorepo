// The blocks of the page play once, when they are read (src/scripts/reveal.ts), and the evening is held while it is
// scrolled (src/scripts/scenes.ts). Durations and curve come from the tokens, through the computed style.

import { type Entry, release, REVEAL_MARGIN, reveal } from './reveal';
import { sceneProgress, screenScale, scrollForStep, stepAt, type View } from './scenes';
import { orderTiming } from './timing';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

type Report = (entries: readonly Entry[]) => void;

class PlayOnce extends HTMLElement {
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
      const shift = (before[index] ?? 0) - item.getBoundingClientRect().top;
      item.animate([{ transform: `translateY(${String(shift)}px)` }, { transform: 'none' }], timing);
    });
  }
}

// The smallest a step's screen shrinks to, on a short window, so that the step is still read whole: below it, the
// scene is not held and the steps follow one another.
const SMALLEST_SCREEN = 0.75;

// The evening, held while it is scrolled: its script alone sets `data-held` (sections/evening.astro), outside reduced
// motion and only if every step fits the window; then the scroll picks the step shown (src/scripts/scenes.ts). The
// gestures of its screens play when their step is shown. Reduced motion turned on during the visit lets the steps
// follow one another again, for good.
class EveningScenes extends HTMLElement {
  #steps: HTMLElement[] = [];
  #ranks: HTMLElement[] = [];
  #shown = -1;
  #frame = 0;
  // The gestures waiting for their step, by step.
  #waiting = new Map<number, Set<{ block: HTMLElement; report: Report }>>();
  #cleanups: (() => void)[] = [];

  connectedCallback() {
    this.#steps = [...this.querySelectorAll<HTMLElement>('[data-step]')];
    this.#ranks = [...this.querySelectorAll<HTMLElement>('.ranks > li')];
    const held = !reducedMotion.matches && this.#hold();
    for (const [step, element] of this.#steps.entries()) {
      for (const block of element.querySelectorAll<PlayOnce>('play-once, tonight-order')) {
        block.start(held ? this.#whenShown(step, block) : block.inView);
      }
    }
    if (!held) return;
    this.#update();
    this.#listen(window, 'scroll', this.#schedule, { passive: true });
    this.#listen(window, 'resize', this.#refit);
    // The fonts change the heights the fit was measured on.
    void document.fonts.ready.then(this.#refit);
    // A focused link of a hidden step (a proof's source) brings its step into view.
    this.#listen(this, 'focusin', this.#onFocus);
    this.#listen(reducedMotion, 'change', (event) => {
      if ((event as MediaQueryListEvent).matches) this.#release();
    });
  }

  disconnectedCallback() {
    for (const cleanup of this.#cleanups.splice(0)) cleanup();
  }

  // Holds the scene if every step fits the window, its screen shrunk if need be; otherwise leaves the steps as they are.
  #hold(): boolean {
    // The browser keeps what is in view in place when the track grows (scroll anchoring): a reload in the middle would
    // land past the evening. The reading position it restored is the held scene's own, so it is kept.
    const reading = window.scrollY;
    this.dataset['held'] = '';
    const held = this.#fit();
    if (!held) delete this.dataset['held'];
    if (window.scrollY !== reading) window.scrollTo({ top: reading, behavior: 'instant' });
    return held;
  }

  // Fits each step's screen in the room its text leaves it in the scene; false if one would be too small to read.
  #fit(): boolean {
    const list = this.querySelector<HTMLElement>('.steps');
    if (!list) return false;
    const screens = this.#steps.map((step) => step.querySelector<HTMLElement>('[data-screen]'));
    for (const screen of screens) screen?.style.removeProperty('zoom');
    const room = list.clientHeight;
    const scales = this.#steps.map((step, index) => {
      const screen = screens[index];
      if (!screen) return 1;
      return screenScale(room - (step.offsetHeight - screen.offsetHeight), screen.offsetHeight, SMALLEST_SCREEN);
    });
    if (scales.some((scale) => scale === undefined)) return false;
    // `zoom` through the CSS object model, which the CSP allows (no style attribute is written in the HTML).
    scales.forEach((scale, index) => {
      if (scale !== undefined && scale < 1) screens[index]?.style.setProperty('zoom', String(scale));
    });
    return this.#steps.every((step) => step.offsetHeight <= room);
  }

  readonly #refit = () => {
    if (this.dataset['held'] === undefined) return;
    if (this.#fit()) this.#update();
    else this.#release();
  };

  // The window's height under the header, as the held scene sees it.
  #view(): View {
    const scene = this.querySelector<HTMLElement>('.scene');
    const offset = scene ? Number.parseFloat(getComputedStyle(scene).top) || 0 : 0;
    return { height: offset + (scene?.offsetHeight ?? window.innerHeight), offset };
  }

  readonly #schedule = () => {
    if (this.#frame) return;
    this.#frame = requestAnimationFrame(() => {
      this.#frame = 0;
      this.#update();
    });
  };

  #update() {
    const step = stepAt(sceneProgress(this.getBoundingClientRect(), this.#view()), this.#steps.length);
    if (step === this.#shown) return;
    this.#shown = step;
    this.#steps.forEach((element, index) => {
      element.toggleAttribute('data-shown', index === step);
      element.toggleAttribute('data-past', index < step);
    });
    this.#ranks.forEach((rank, index) => rank.toggleAttribute('data-shown', index === step));
    this.#show(step);
  }

  // Plays the gestures of a step now shown.
  #show(step: number) {
    for (const { block, report } of this.#waiting.get(step) ?? []) {
      report([{ isIntersecting: true, boundingClientRect: { bottom: block.getBoundingClientRect().bottom } }]);
    }
  }

  #whenShown(step: number, block: HTMLElement) {
    return (report: Report) => {
      const waiting = { block, report };
      const set = this.#waiting.get(step) ?? new Set();
      set.add(waiting);
      this.#waiting.set(step, set);
      return () => {
        set.delete(waiting);
      };
    };
  }

  readonly #onFocus = (event: Event) => {
    const step = this.#steps.findIndex((element) => element.contains(event.target as Node));
    if (step < 0 || step === this.#shown) return;
    const track = this.getBoundingClientRect();
    const top = scrollForStep(step, this.#steps.length, { top: track.top + window.scrollY, height: track.height }, this.#view());
    window.scrollTo({ top, behavior: 'instant' });
  };

  #listen(target: EventTarget, type: string, listener: (event: Event) => void, options?: AddEventListenerOptions) {
    target.addEventListener(type, listener, options);
    this.#cleanups.push(() => {
      target.removeEventListener(type, listener, options);
    });
  }

  // The steps follow one another again: the step shown stays in view, and every gesture still waiting plays.
  #release() {
    if (this.dataset['held'] === undefined) return;
    const shown = this.#steps[this.#shown];
    for (const cleanup of this.#cleanups.splice(0)) cleanup();
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    delete this.dataset['held'];
    for (const element of [...this.#steps, ...this.#ranks]) {
      element.removeAttribute('data-shown');
      element.removeAttribute('data-past');
      element.querySelector<HTMLElement>('[data-screen]')?.style.removeProperty('zoom');
    }
    shown?.scrollIntoView({ block: 'start', behavior: 'instant' });
    for (const step of this.#waiting.keys()) this.#show(step);
  }
}

customElements.define('play-once', PlayOnce);
customElements.define('tonight-order', TonightOrder);
customElements.define('evening-scenes', EveningScenes);
