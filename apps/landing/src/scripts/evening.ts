// The blocks of the page play once, when they are read (src/scripts/reveal.ts), and the evening is held while it is
// scrolled (src/scripts/scenes.ts). Durations and curves come from the tokens, through the computed style.

import { flipShift, Moves, ownMoves } from './moves';
import { type Entry, release, REVEAL_MARGIN, reveal } from './reveal';
import {
  afterHold,
  type Change,
  entered,
  Gestures,
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

// Under `md`, a phone: the screen's frame follows each step's height rather than the tallest one's.
const phone = window.matchMedia('(width < 48rem)');

// The smallest a step's screen shrinks to, on a short window, so that the step is still read whole: below it, the
// scene is not held and the steps follow one another. On a phone, until its smallest text (14 px) reaches 12 px, the
// least the charte allows (docs/charte.md, "Typographie").
const SMALLEST_SCREEN = { phone: 12 / 14, wide: 0.75 };

// How far a screen's content slides as it leaves or comes in, and a line of text as it leaves (packages/tokens).
const SCREEN_SHIFT = 'calc(var(--spacing) * 6)';
const TEXT_SHIFT = 'var(--motion-distance-text)';

// The scene is in view once its track has risen past two thirds of the window, as a block is read (src/scripts/reveal.ts),
// and until it has left the window.
const SCENE_IN_VIEW = '0px 0px -33% 0px';

const ignore = () => undefined;

// A gesture of a step: its block, and how to tell it that it is read.
interface Gesture {
  readonly block: PlayOnce;
  readonly report: Report;
}

// The evening, held while it is scrolled: its script alone sets `data-held` (sections/evening.astro), outside reduced
// motion and only if every step fits the window; then the scroll picks the step shown (src/scripts/scenes.ts), and a
// change of step plays here, in Web Animations: the text shown leaves, then the next comes in, line after line, never
// both together; in the one frame of the screen, its content slides out, then the next slides in and its messages
// come one after the other, once the scene is in view. A fast scroll ends the moves under way and goes straight to the
// step reached. The steps hidden stay in the page for a screen reader; the keyboard's focus brings the window to them.
// Reduced motion turned on during the visit lets the steps follow one another again, for good.
class EveningScenes extends HTMLElement {
  #steps: HTMLElement[] = [];
  #links: HTMLAnchorElement[] = [];
  #scene: Scene = stillScene(0);
  #marked: number | undefined;
  readonly #moves = new Moves<Animation>();
  #generation = 0;
  #frame = 0;
  #fitFrame = 0;
  readonly #gestures = new Gestures<Gesture>(({ block, report }) => {
    report([{ isIntersecting: true, boundingClientRect: { bottom: block.getBoundingClientRect().bottom } }]);
  });
  #cleanups: (() => void)[] = [];

  connectedCallback() {
    this.#steps = [...this.querySelectorAll<HTMLElement>('[data-step]')];
    this.#links = [...this.querySelectorAll<HTMLAnchorElement>('.timeline a')];
    if (reducedMotion.matches || !this.#hold()) {
      for (const block of this.querySelectorAll<PlayOnce>('[data-step] :is(play-once, tonight-order)')) block.start(block.inView);
      return;
    }
    // Whatever fails while the scene is set up lets its steps follow one another, all shown.
    try {
      this.#start();
    } catch (error) {
      this.#release();
      throw error;
    }
  }

  disconnectedCallback() {
    for (const cleanup of this.#cleanups.splice(0)) cleanup();
  }

  #start() {
    const first = heldStep(this.#progress(), this.#steps.length, undefined);
    this.#setShown(first);
    this.#scene = stillScene(first);
    for (const [step, element] of this.#steps.entries()) {
      for (const block of element.querySelectorAll<PlayOnce>('play-once, tonight-order')) {
        block.start((report) => this.#gestures.wait(step, { block, report }));
      }
    }
    this.#mark(first);
    this.#gestures.show(first);
    const observer = new IntersectionObserver(this.#see, { rootMargin: SCENE_IN_VIEW });
    observer.observe(this);
    this.#cleanups.push(() => {
      observer.disconnect();
    });
    this.#listen(window, 'scroll', this.#schedule, { passive: true });
    this.#listen(window, 'resize', this.#scheduleRefit);
    // The fonts change the heights the fit was measured on.
    void document.fonts.ready.then(this.#refit);
    this.#links.forEach((link, step) => {
      this.#listen(link, 'click', (event) => {
        event.preventDefault();
        this.#scrollTo(step);
      });
    });
    // The keyboard's focus, gone into a step that is not shown, brings the window to it, which shows it.
    this.#steps.forEach((element, step) => {
      this.#listen(element, 'focusin', () => {
        if (step !== this.#scene.heading) this.#scrollTo(step);
      });
    });
    this.#listen(reducedMotion, 'change', (event) => {
      if ((event as MediaQueryListEvent).matches) this.#release();
    });
  }

  readonly #see = (entries: IntersectionObserverEntry[]) => {
    this.#gestures.see(entries.at(-1)?.isIntersecting ?? false);
  };

  // Holds the scene if every step fits the window, its screen shrunk if need be; otherwise leaves the steps as they are.
  #hold(): boolean {
    // The browser keeps what is in view in place when the track grows (scroll anchoring): a reload in the middle would
    // land past the evening, and a link to a later section short of it (src/scripts/scenes.ts, `afterHold`).
    const reading = window.scrollY;
    this.dataset['held'] = '';
    this.style.setProperty('--moments', String(this.#steps.length));
    const held = this.#fit();
    if (!held) this.#unhold();
    const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const after = afterHold(navigation?.type, window.location.hash);
    if (after === 'position' && window.scrollY !== reading) window.scrollTo({ top: reading, behavior: 'instant' });
    if (after === 'fragment') this.#toFragment(held);
    return held;
  }

  #unhold() {
    delete this.dataset['held'];
    this.style.removeProperty('--moments');
    this.style.removeProperty('--moment');
    this.#unfit();
  }

  // The target of the address, back in view: a step of the held scene is shown, anything else is scrolled to.
  #toFragment(held: boolean) {
    const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    if (!target) return;
    const step = this.#steps.indexOf(target);
    if (held && step >= 0) this.#scrollTo(step);
    else target.scrollIntoView({ behavior: 'instant' });
  }

  // Fits the steps under the section's title, which never shrinks: their screens shrink first; if that is not enough,
  // the scene's spacings tighten (`data-tight`, sections/evening.astro) and the screens are fitted again.
  #fit(): boolean {
    this.#unfit();
    if (this.#fitScreens()) return true;
    this.dataset['tight'] = '';
    return this.#fitScreens();
  }

  // Gives every step's text the height of the tallest, so that its screen always starts at the same place, and, at a
  // computer, every screen too, so that its one frame never jumps; on a phone, the frame follows each step. Then fits
  // the steps in the room the scene leaves them, their screens shrunk alike if need be; false if they would be too
  // small to read. The frames and `zoom` go through the CSS object model, which the CSP allows (no style attribute in
  // the HTML).
  #fitScreens(): boolean {
    const list = this.querySelector<HTMLElement>('.steps');
    if (!list) return false;
    this.#unframe();
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
    delete this.dataset['tight'];
    this.#unframe();
  }

  #unframe() {
    this.style.removeProperty('--text-frame');
    this.style.removeProperty('--screen-frame');
    for (const step of this.#steps) step.querySelector<HTMLElement>('[data-screen]')?.style.removeProperty('zoom');
  }

  // A resize fits the scene again once per frame, however many it fires.
  readonly #scheduleRefit = () => {
    if (this.#fitFrame) return;
    this.#fitFrame = requestAnimationFrame(() => {
      this.#fitFrame = 0;
      this.#refit();
    });
  };

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
    if (change.finish) this.#moves.finish();
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
    this.#letGo(step);
    this.#setShown(to);
    if (!timing) {
      this.#gestures.show(to);
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
      if (generation === this.#generation) this.#gestures.show(to);
    }, wait);
    const entering = this.#moves.under((animation) => animation.effect instanceof KeyframeEffect && step.contains(animation.effect.target));
    return Promise.all(entering.map((animation) => animation.finished));
  }

  #move(element: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions): Animation {
    return this.#moves.add(element.animate(keyframes, options));
  }

  // Cancels the script's moves on a step, those its exit left held on their end included; the CSS's own animations and
  // transitions play on.
  #letGo(step: HTMLElement) {
    for (const animation of ownMoves(step.getAnimations({ subtree: true }))) animation.cancel();
  }

  // Only the step shown is on: the others are hidden from the eye and the pointer, not from a screen reader.
  #setShown(to: number) {
    this.#steps.forEach((element, index) => {
      element.toggleAttribute('data-shown', index === to);
    });
  }

  // The hours: the one reached is the current step, the ones before it passed; `--moment` places the timeline's dot.
  #mark(to: number) {
    if (to === this.#marked) return;
    this.#marked = to;
    this.style.setProperty('--moment', String(to));
    this.#links.forEach((link, index) => {
      if (index === to) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
      link.parentElement?.toggleAttribute('data-past', index < to);
    });
  }

  // An hour of the timeline, or the focus gone into a step, brings the window to that step.
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

  // The steps follow one another again, all shown: every move of the script is cancelled, the step shown stays in view,
  // and every block still waiting for its step plays as it is read, like any other.
  #release() {
    if (this.dataset['held'] === undefined) return;
    const shown = this.#steps[this.#scene.shown];
    for (const cleanup of this.#cleanups.splice(0)) cleanup();
    cancelAnimationFrame(this.#frame);
    cancelAnimationFrame(this.#fitFrame);
    this.#frame = 0;
    this.#fitFrame = 0;
    this.#generation += 1;
    this.#moves.cancel();
    for (const step of this.#steps) {
      this.#letGo(step);
      step.removeAttribute('data-shown');
    }
    this.#unhold();
    this.#marked = undefined;
    for (const link of this.#links) {
      link.removeAttribute('aria-current');
      link.parentElement?.removeAttribute('data-past');
    }
    shown?.scrollIntoView({ block: 'start', behavior: 'instant' });
    for (const { block } of this.#gestures.release()) block.watch();
  }
}

customElements.define('play-once', PlayOnce);
customElements.define('tonight-order', TonightOrder);
customElements.define('evening-scenes', EveningScenes);
