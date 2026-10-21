// The timing of the evening's moves, read from the tokens (packages/tokens/theme.css) through a computed style.

type Tokens = Pick<CSSStyleDeclaration, 'getPropertyValue'>;

// The same timing as the transitions that straighten the items (src/styles/global.css, `tonight-order`), read on the
// order itself: its delay is its own (`--order-delay`); none if one is missing.
export function orderTiming(style: Tokens): KeyframeAnimationOptions | undefined {
  const duration = milliseconds(style.getPropertyValue('--duration-slow'));
  const delay = milliseconds(style.getPropertyValue('--order-delay'));
  const easing = style.getPropertyValue('--ease-standard').trim();
  if (duration === undefined || delay === undefined || !easing) return undefined;
  return { duration, delay, easing, fill: 'backwards' };
}

// Tom waves only once he is seen: half of him in the window, the threshold the observer reports at
// (atoms/tom-illustration.astro). On a phone, Tom at the top of the page starts below the window.
export const IN_VIEW = 0.5;

export function inView(entry: { isIntersecting: boolean; intersectionRatio: number }): boolean {
  return entry.isIntersecting && entry.intersectionRatio >= IN_VIEW;
}

// Tom's arrival at the end of the page is over when the arriving element's own move ends, not another of its properties
// nor a transition that bubbles up from inside it: then he waves (atoms/tom-illustration.astro).
export function arrivalEnded(event: { target: unknown; propertyName: string }, host: unknown): boolean {
  return event.target === host && event.propertyName === 'translate';
}

// A CSS <time>: a number and its unit, `ms` or `s`, in any case (https://www.w3.org/TR/css-values-4/#time).
const TIME = /^(?<number>\d*\.?\d+)(?<unit>ms|s)$/iu;

// A CSS duration (`200ms`, `0.2s`) in milliseconds; none if it is empty, has no unit or another one.
export function milliseconds(value: string): number | undefined {
  const groups = TIME.exec(value.trim())?.groups;
  if (!groups?.['number'] || !groups['unit']) return undefined;
  const number = Number(groups['number']);
  return groups['unit'].toLowerCase() === 'ms' ? number : number * 1000;
}
