import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scalesCss } from './scales.mjs';

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

test('scales.css is what scales.mjs writes', () => {
  assert.equal(read('./scales.css'), scalesCss());
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
  ['foreground', 'highlight'],
  ['card-foreground', 'card'],
  ['popover-foreground', 'popover'],
  ['secondary-foreground', 'secondary'],
  ['accent-foreground', 'accent'],
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
  ['qr', 'qr-background'],
  ['disabled-foreground', 'disabled'],
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
