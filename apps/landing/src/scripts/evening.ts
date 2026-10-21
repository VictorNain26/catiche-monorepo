// The blocks of the page play once, when they are read (src/scripts/reveal.ts), and the evening is held while it is
// scrolled (src/scripts/scenes.ts), and the hour of the evening that does not start runs (src/scripts/clock.ts). Durations and curves come from the tokens, through the computed style.

import { CLOCK_MINUTES, clockMinute, clockTime } from './clock';
import { type Entry, release, REVEAL_MARGIN, reveal } from './reveal';
import {
  type Change,
  entered,
  heldStep,
  left,
  request,
  type Scene,
  sceneProgress,
  screenScale,
  scrollForStep,
  stillScene,
  type View,
} from './scenes';
import { orderTiming, type SceneTiming, sceneTiming } from './timing';

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

// Under `md`, a phone: the screen's frame follows each step's height rather than the tallest one's.
const phone = window.matchMedia('(width < 48rem)');

// The smallest a step's screen shrinks to, on a short window, so that the step is still read whole: below it, the
// scene is not held and the steps follow one another. On a phone, where its text is already small, hardly at all.
const SMALLEST_SCREEN = { phone: 0.9, wide: 0.75 };

// How far a screen's content slides as it leaves or comes in, and a line of text as it leaves.
const SCREEN_SHIFT = 'calc(var(--spacing) * 6)';
const TEXT_SHIFT = '0.25em';

const ignore = () => undefined;

// The evening, held while it is scrolled: its script alone sets `data-held` (sections/evening.astro), outside reduced
// motion and only if every step fits the window; then the scroll picks the step shown (src/scripts/scenes.ts), and a
// change of step plays here, in Web Animations: the text shown leaves, then the next comes in, line after line, never
// both together; in the one frame of the screen, its content slides out, then the next slides in and its messages
// come one after the other. A fast scroll ends the moves under way and goes straight to the step reached. The steps
// hidden are inert. Reduced motion turned on during the visit lets the steps follow one another again, for good.
class EveningScenes extends HTMLElement {
  #steps: HTMLElement[] = [];
  #links: HTMLAnchorElement[] = [];
  #scene: Scene = stillScene(0);
  #moves: Animation[] = [];
  #generation = 0;
  #frame = 0;
  // The gestures waiting for their step, by step.
  #waiting = new Map<number, Set<{ block: HTMLElement; report: Report }>>();
  #cleanups: (() => void)[] = [];

  connectedCallback() {
    this.#steps = [...this.querySelectorAll<HTMLElement>('[data-step]')];
    this.#links = [...this.querySelectorAll<HTMLAnchorElement>('.timeline a')];
    const held = !reducedMotion.matches && this.#hold();
    for (const [step, element] of this.#steps.entries()) {
      for (const block of element.querySelectorAll<PlayOnce>('play-once, tonight-order')) {
        block.start(held ? this.#whenShown(step, block) : block.inView);
      }
    }
    if (!held) return;
    const first = heldStep(this.#progress(), this.#steps.length, undefined);
    this.#setShown(first);
    this.#scene = stillScene(first);
    this.#mark(first);
    this.#play(first);
    this.#listen(window, 'scroll', this.#schedule, { passive: true });
    this.#listen(window, 'resize', this.#refit);
    // The fonts change the heights the fit was measured on.
    void document.fonts.ready.then(this.#refit);
    this.#links.forEach((link, step) => {
      this.#listen(link, 'click', (event) => {
        event.preventDefault();
        this.#scrollTo(step);
      });
    });
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
    if (!held) {
      this.#unfit();
      delete this.dataset['held'];
    }
    if (window.scrollY !== reading) window.scrollTo({ top: reading, behavior: 'instant' });
    return held;
  }

  // Gives every step's text the height of the tallest, so that its screen always starts at the same place, and, at a
  // computer, every screen too, so that its one frame never jumps; on a phone, the frame follows each step. Then fits
  // the steps in the room the scene leaves them, their screens shrunk alike if need be; false if they would be too
  // small to read. The frames and `zoom` go through the CSS object model, which the CSP allows (no style attribute in
  // the HTML).
  #fit(): boolean {
    const list = this.querySelector<HTMLElement>('.steps');
    if (!list) return false;
    this.#unfit();
    const tallest = (selector: string) => Math.max(...this.#steps.map((element) => element.querySelector<HTMLElement>(selector)?.offsetHeight ?? 0));
    this.style.setProperty('--text-frame', `${String(tallest('[data-text]'))}px`);
    if (!phone.matches) this.style.setProperty('--screen-frame', `${String(tallest('[data-screen] > *'))}px`);
    const room = list.clientHeight;
    const smallest = phone.matches ? SMALLEST_SCREEN.phone : SMALLEST_SCREEN.wide;
    const screens = this.#steps.map((step) => step.querySelector<HTMLElement>('[data-screen]'));
    const scales = this.#steps.map((step, index) => {
      const screen = screens[index];
      return screen ? screenScale(room - (step.offsetHeight - screen.offsetHeight), screen.offsetHeight, smallest) : 1;
    });
    if (scales.some((scale) => scale === undefined)) return false;
    const scale = Math.min(...scales.map((value) => value ?? 1));
    if (scale < 1) for (const element of screens) element?.style.setProperty('zoom', String(scale));
    return this.#steps.every((element) => element.offsetHeight <= room);
  }

  #unfit() {
    this.style.removeProperty('--text-frame');
    this.style.removeProperty('--screen-frame');
    for (const step of this.#steps) step.querySelector<HTMLElement>('[data-screen]')?.style.removeProperty('zoom');
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

  #progress(): number {
    return sceneProgress(this.getBoundingClientRect(), this.#view());
  }

  readonly #schedule = () => {
    if (this.#frame) return;
    this.#frame = requestAnimationFrame(() => {
      this.#frame = 0;
      this.#update();
    });
  };

  #update() {
    this.#apply(request(this.#scene, heldStep(this.#progress(), this.#steps.length, this.#scene.heading)));
  }

  // Plays a change of the scene (src/scripts/scenes.ts): the moves under way end at once when it says so; a leave is
  // followed by the coming in of the step the scene heads to by then, so that a step only passed by is never played.
  #apply(change: Change) {
    this.#scene = change.scene;
    if (change.finish) for (const animation of this.#moves.splice(0)) animation.finish();
    this.#mark(this.#scene.heading);
    const { play } = change;
    if (!play) return;
    this.#generation += 1;
    const generation = this.#generation;
    const timing = sceneTiming(getComputedStyle(this));
    const step = this.#steps[play.step];
    if (play.kind === 'leave') {
      const gone = timing && step ? this.#leave(step, play.direction, timing) : Promise.resolve();
      gone.then(() => {
        if (generation === this.#generation) this.#apply(left(this.#scene));
      }, ignore);
      return;
    }
    this.#enter(play.step, play.direction, timing).then(() => {
      if (generation === this.#generation) this.#scene = entered(this.#scene);
    }, ignore);
  }

  // The step shown leaves: its text rises out quickly, its screen's content slides out a little slower, both at once.
  // The text has left when the promise resolves; the screen's content goes on, and lets go once it has left.
  #leave(step: HTMLElement, direction: 1 | -1, timing: SceneTiming): Promise<unknown> {
    const out = { duration: timing.fast, easing: timing.exit, fill: 'forwards' } as const;
    const text = [...step.querySelectorAll<HTMLElement>('[data-line], [data-proof]')].map((line) =>
      this.#move(
        line,
        [
          { opacity: 1, translate: '0 0' },
          { opacity: 0, translate: `0 calc(${TEXT_SHIFT} * ${String(-direction)})` },
        ],
        out,
      ),
    );
    for (const content of step.querySelectorAll<HTMLElement>('[data-screen] > * > *')) {
      const leaving = this.#move(
        content,
        [
          { opacity: 1, translate: '0 0' },
          { opacity: 0, translate: `0 calc(${SCREEN_SHIFT} * ${String(-direction)})` },
        ],
        { ...out, duration: timing.base },
      );
      leaving.finished.then(() => {
        if (!step.hasAttribute('data-shown')) leaving.cancel();
      }, ignore);
    }
    return Promise.all(text.map((animation) => animation.finished));
  }

  // The step reached comes in: its hour, its title and its sentence rise into their masks one after the other, its
  // proof fades in; once the screen's former content has left, the new one slides in, and its messages and gestures play.
  // On a phone, the screen's frame takes the new content's height at the same pace. Resolves once it has come in.
  #enter(to: number, direction: 1 | -1, timing: SceneTiming | undefined): Promise<unknown> {
    const step = this.#steps[to];
    if (!step) return Promise.resolve();
    const before = this.querySelector<HTMLElement>('[data-step][data-shown] [data-screen] > *')?.offsetHeight;
    // What its last exit left behind (held on its end) lets go: its content is shown by its own style again.
    for (const animation of step.getAnimations({ subtree: true })) {
      if (!(animation instanceof CSSAnimation) && !(animation instanceof CSSTransition)) animation.cancel();
    }
    this.#setShown(to);
    if (!timing) {
      this.#play(to);
      return Promise.resolve();
    }
    const frame = step.querySelector<HTMLElement>('[data-screen] > *');
    if (frame && before !== undefined && phone.matches && before !== frame.offsetHeight) {
      this.#move(frame, [{ height: `${String(before)}px` }, { height: `${String(frame.offsetHeight)}px` }], {
        duration: timing.slow,
        easing: timing.enter,
      });
    }
    const lines = [...step.querySelectorAll<HTMLElement>('[data-line]')];
    const gap = timing.stagger / 2;
    lines.forEach((line, index) => {
      this.#move(line, [{ translate: `0 ${String(direction * 100)}%` }, { translate: '0 0' }], {
        duration: timing.slow,
        delay: index * gap,
        easing: timing.enter,
        fill: 'backwards',
      });
    });
    const proof = step.querySelector<HTMLElement>('[data-proof]');
    if (proof)
      this.#move(proof, [{ opacity: 0 }, { opacity: 1 }], {
        duration: timing.slow,
        delay: lines.length * gap,
        easing: timing.enter,
        fill: 'backwards',
      });
    const wait = timing.base - timing.fast;
    for (const content of step.querySelectorAll<HTMLElement>('[data-screen] > * > *')) {
      this.#move(
        content,
        [
          { opacity: 0, translate: `0 calc(${SCREEN_SHIFT} * ${String(direction)})` },
          { opacity: 1, translate: '0 0' },
        ],
        {
          duration: timing.slow,
          delay: wait,
          easing: timing.enter,
          fill: 'backwards',
        },
      );
    }
    const generation = this.#generation;
    window.setTimeout(() => {
      if (generation === this.#generation) this.#play(to);
    }, wait);
    const entering = this.#moves.filter((animation) => animation.effect instanceof KeyframeEffect && step.contains(animation.effect.target));
    return Promise.all(entering.map((animation) => animation.finished));
  }

  #move(element: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions): Animation {
    const animation = element.animate(keyframes, options);
    this.#moves.push(animation);
    animation.finished.then(() => {
      this.#moves = this.#moves.filter((move) => move !== animation);
    }, ignore);
    return animation;
  }

  // Only the step shown is on, and reachable; the others are inert.
  #setShown(to: number) {
    this.#steps.forEach((element, index) => {
      element.toggleAttribute('data-shown', index === to);
      element.inert = index !== to;
    });
  }

  // The hours: the one reached is the current step, the ones before it passed.
  #mark(to: number) {
    this.#links.forEach((link, index) => {
      if (index === to) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
      link.parentElement?.toggleAttribute('data-past', index < to);
    });
  }

  // Plays the gestures of a step now shown.
  #play(step: number) {
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

  // An hour of the timeline brings the window to its step.
  #scrollTo(step: number) {
    const track = this.getBoundingClientRect();
    const top = scrollForStep(step, this.#steps.length, { top: track.top + window.scrollY, height: track.height }, this.#view());
    window.scrollTo({ top, behavior: 'instant' });
  }

  #listen(target: EventTarget, type: string, listener: (event: Event) => void, options?: AddEventListenerOptions) {
    target.addEventListener(type, listener, options);
    this.#cleanups.push(() => {
      target.removeEventListener(type, listener, options);
    });
  }

  // The steps follow one another again, all shown: the step shown stays in view, and every gesture still waiting plays.
  #release() {
    if (this.dataset['held'] === undefined) return;
    const shown = this.#steps[this.#scene.shown];
    for (const cleanup of this.#cleanups.splice(0)) cleanup();
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#generation += 1;
    for (const animation of this.#moves.splice(0)) animation.cancel();
    delete this.dataset['held'];
    this.#unfit();
    for (const element of this.#steps) {
      element.removeAttribute('data-shown');
      element.inert = false;
    }
    for (const link of this.#links) {
      link.removeAttribute('aria-current');
      link.parentElement?.removeAttribute('data-past');
    }
    shown?.scrollIntoView({ block: 'start', behavior: 'instant' });
    for (const step of this.#waiting.keys()) this.#play(step);
  }
}

// The hour of the evening that does not start (sections/problem.astro): outside reduced motion, it follows its title as
// it is scrolled (src/scripts/clock.ts), up to 18 h, and never goes back. Its HTML is 17 h 30, which reduced motion
// turned on during the visit brings back, for good.
class ProblemClock extends HTMLElement {
  #reached = 0;
  #frame = 0;
  #cleanups: (() => void)[] = [];

  connectedCallback() {
    const title = this.closest('h2');
    const hour = this.querySelector<HTMLElement>('[data-clock]');
    if (reducedMotion.matches || !title || !hour) return;
    const header = document.querySelector('header');
    const update = () => {
      this.#frame = 0;
      const view = { height: window.innerHeight, offset: header?.offsetHeight ?? 0 };
      const minute = clockMinute(title.getBoundingClientRect().top, view, this.#reached);
      if (minute === this.#reached) return;
      this.#reached = minute;
      hour.textContent = clockTime(minute);
      if (minute === CLOCK_MINUTES) this.#stop();
    };
    const schedule = () => {
      if (!this.#frame) this.#frame = requestAnimationFrame(update);
    };
    const onMotion = (event: MediaQueryListEvent) => {
      if (!event.matches) return;
      this.#stop();
      hour.textContent = clockTime(0);
    };
    window.addEventListener('scroll', schedule, { passive: true });
    reducedMotion.addEventListener('change', onMotion);
    this.#cleanups.push(() => {
      window.removeEventListener('scroll', schedule);
      reducedMotion.removeEventListener('change', onMotion);
      cancelAnimationFrame(this.#frame);
      this.#frame = 0;
    });
    schedule();
  }

  disconnectedCallback() {
    this.#stop();
  }

  #stop() {
    for (const cleanup of this.#cleanups.splice(0)) cleanup();
  }
}

customElements.define('play-once', PlayOnce);
customElements.define('problem-clock', ProblemClock);
customElements.define('tonight-order', TonightOrder);
customElements.define('evening-scenes', EveningScenes);
