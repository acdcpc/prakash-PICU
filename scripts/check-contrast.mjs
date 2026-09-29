#!/usr/bin/env node
/**
 * WCAG contrast check for the design-system tokens in src/index.css.
 * Fails when a documented text/background pair falls below its target ratio.
 * Usage: node scripts/check-contrast.mjs
 */
import { readFileSync } from 'node:fs';

const css = readFileSync('src/index.css', 'utf8');
const token = (name, depth = 0) => {
  if (depth > 5) throw new Error(`alias loop while resolving --${name}`);
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6}|var\\(--[a-z0-9-]+\\))`));
  if (!m) throw new Error(`token --${name} not found`);
  const value = m[1];
  return value.startsWith('var(') ? token(value.slice(6, -1).trim(), depth + 1) : value;
};
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const lum = (hex) => rgb(hex).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const T = (n) => token(n);
// [label, foreground, background, minimum ratio]
// 4.5 = AA normal text, 3.0 = AA large/bold text and UI components.
const PAIRS = [
  ['body text on canvas', T('text'), T('bg'), 4.5],
  ['body text on card', T('text'), T('bg-card'), 4.5],
  ['secondary text on card', T('text-secondary'), T('bg-card'), 4.5],
  ['secondary text on canvas', T('text-secondary'), T('bg'), 4.5],
  ['muted metadata on card', T('muted'), T('bg-card'), 4.5],
  ['heading on card', T('navy'), T('bg-card'), 4.5],
  ['white on navy surface', '#ffffff', T('navy'), 4.5],
  ['ink on coral action', T('ink'), T('coral'), 4.5],
  ['white on teal action', '#ffffff', T('teal'), 4.5],
  ['coral eyebrow on canvas', T('coral'), T('bg'), 3.0],
  ['coral eyebrow on card', T('coral'), T('bg-card'), 3.0],
  ['teal link on card', T('teal'), T('bg-card'), 4.5],
  ['danger text on card', T('danger'), T('bg-card'), 4.5],
  ['success text on card', T('success'), T('bg-card'), 4.5],
];

let failed = 0;
console.log('Contrast check (WCAG AA)');
console.log('─'.repeat(62));
for (const [label, fg, bg, min] of PAIRS) {
  const r = ratio(fg, bg);
  const pass = r >= min;
  if (!pass) failed += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${r.toFixed(2).padStart(5)}  (min ${min})  ${label}  ${fg} on ${bg}`);
}
console.log('─'.repeat(62));
console.log(`${PAIRS.length - failed}/${PAIRS.length} pairs meet AA`);
process.exit(failed ? 1 : 0);
