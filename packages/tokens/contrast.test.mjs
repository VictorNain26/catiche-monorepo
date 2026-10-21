import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scalesCss, scalesJson } from './scales.mjs';

const read = (file) => readFileSync(new URL(file, import.meta.url), 'utf8');
const DARK = /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{([\s\S]*?)\n\}/;
const declarations = (css) => Object.fromEntries([...css.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]));

// Each mode's variables: the light ones, then the dark block's on top of them.
function variables(file) {
  const css = read(file);
  const dark = DARK.exec(css);
  const light = declarations(css.replace(dark?.[0] ?? '', ''));
  return { light, dark: { ...light, ...declarations(dark?.[1] ?? '') } };
}

const scales = variables('./scales.css');
const theme = variables('./theme.css');

function resolve(vars, name) {
  const value = vars[name];
  assert.ok(value, `--${name} is not defined`);
  const reference = /^var\(--([a-z0-9-]+)\)$/.exec(value);
  return reference ? resolve(vars, reference[1]) : value;
}

const modes = ['light', 'dark'].map((mode) => {
  const vars = { ...scales[mode], ...theme[mode] };
  return [mode, (role) => resolve(vars, `color-${role}`)];
});

test('scales.css and scales.json are what scales.mjs writes', () => {
  assert.equal(read('./scales.css'), scalesCss());
  assert.equal(read('./scales.json'), scalesJson());
});

test('every scale step has a value of its own in the dark mode', () => {
  assert.deepEqual(Object.keys(scales.dark).sort(), Object.keys(scales.light).sort());
  const unchanged = Object.keys(scales.light).filter((name) => scales.light[name] === scales.dark[name]);
  assert.deepEqual(unchanged, []);
});

function luminance(hex) {
  assert.match(hex, /^#[0-9a-f]{6}$/i, `${hex} is not a six-digit hex color`);
  const channel = (i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Text and its background: 4.5:1 (https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
const TEXT = [
  ['foreground', 'background'],
  ['foreground', 'card'],
  ['foreground', 'secondary'],
  ['card-foreground', 'card'],
  ['popover-foreground', 'popover'],
  ['secondary-foreground', 'secondary'],
  ['accent-foreground', 'accent'],
  // The secondary words of a hovered line of a list: muted-foreground would fall to 4.3:1 there.
  ['accent-muted-foreground', 'accent'],
  ['muted-foreground', 'background'],
  ['muted-foreground', 'card'],
  ['muted-foreground', 'secondary'],
  ['primary', 'background'],
  ['primary', 'card'],
  ['primary', 'secondary'],
  ['primary-foreground', 'primary'],
  ['success-foreground', 'success'],
  ['destructive-foreground', 'destructive'],
  ['warning-foreground', 'warning'],
  ['success', 'background'],
  ['success', 'card'],
  ['destructive', 'background'],
  ['destructive', 'card'],
  ['annotation', 'background'],
  ['annotation', 'card'],
  ['annotation', 'secondary'],
  ['disabled-foreground', 'disabled'],
  // The brand's light plane, where a section of the site breathes: the ink, and its second line in the brand's water.
  ['foreground', 'tint'],
  ['primary', 'tint'],
  ['panel-foreground', 'panel'],
];

// A control's border, the focus ring and each chart series: 3:1
// (https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).
const MARKS = [
  ['input', 'background'],
  ['input', 'card'],
  ['input', 'secondary'],
  ['ring', 'background'],
  ['ring', 'card'],
  ...[1, 2, 3, 4].flatMap((n) => [
    [`chart-${String(n)}`, 'background'],
    [`chart-${String(n)}`, 'card'],
  ]),
];

// A color the same in both modes on purpose: an overlay is black.
const FIXED = ['overlay'];

test('every role follows the dark mode: it points at a scale step, is redefined in the dark block, or is fixed', () => {
  const roles = Object.keys(theme.light).filter((name) => name.startsWith('color-'));
  const left = roles.filter((name) => {
    const role = name.slice('color-'.length);
    return !/^var\(--[a-z]+-\d+\)$/.test(theme.light[name]) && theme.dark[name] === theme.light[name] && !FIXED.includes(role);
  });
  assert.deepEqual(left, []);
});

// Next to each other in a stacked bar, two series must differ in lightness, not only in hue: a
// reader who confuses the hues, or a grayscale print, tells them apart by it. 1.4:1 is ours, no
// norm sets one; the charte asks for a label or a shape on top.
const CHART_STEP = 1.4;

for (const [mode, color] of modes) {
  for (const n of [1, 2, 3]) {
    test(`${mode}: chart-${String(n)} and chart-${String(n + 1)} differ in lightness by ${String(CHART_STEP)}:1`, () => {
      const ratio = contrast(color(`chart-${String(n)}`), color(`chart-${String(n + 1)}`));
      assert.ok(ratio >= CHART_STEP, `${color(`chart-${String(n)}`)} next to ${color(`chart-${String(n + 1)}`)} = ${ratio.toFixed(2)}`);
    });
  }
}

for (const [mode, color] of modes) {
  for (const [pairs, minimum, criterion] of [
    [TEXT, 4.5, 'WCAG 1.4.3 (4.5:1)'],
    [MARKS, 3, 'WCAG 1.4.11 (3:1)'],
  ]) {
    for (const [fg, bg] of pairs) {
      test(`${mode}: ${fg} on ${bg} meets ${criterion}`, () => {
        const ratio = contrast(color(fg), color(bg));
        assert.ok(ratio >= minimum, `${color(fg)} on ${color(bg)} = ${ratio.toFixed(2)}`);
      });
    }
  }
}

// The highlighter is one gesture in both modes: a thick reed stroke under the baseline, which never touches the
// letters; the words keep their own ink on the background, and the stroke stands out from it as a mark (3:1).
test('the highlighter is the same stroke in both modes', () => {
  assert.equal(theme.dark['highlight-height'], theme.light['highlight-height']);
});

// It is laid on the background, under the title at the top of the page, and nowhere else; the halo behind the evening
// there can reach under it.
for (const [mode, color] of modes) {
  for (const ground of ['background', 'halo']) {
    test(`${mode}: highlight on ${ground} meets WCAG 1.4.11 (3:1)`, () => {
      const ratio = contrast(color('highlight'), color(ground));
      assert.ok(ratio >= 3, `${color('highlight')} on ${color(ground)} = ${ratio.toFixed(2)}`);
    });
  }
}
