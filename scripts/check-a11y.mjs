#!/usr/bin/env node
/**
 * Static accessibility checks over the source and the built HTML.
 * These complement (and never replace) keyboard + screen-reader review:
 * see docs/ACCESSIBILITY_CHECKLIST.md.
 * Usage: node scripts/check-a11y.mjs
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith('.jsx')) out.push(p);
  }
  return out;
};

const files = walk('src');
const findings = [];
const add = (file, line, message) => findings.push({ file, line, message });

for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const n = i + 1;
    // Images must carry alternative text.
    for (const m of line.matchAll(/<img\b[^>]*>/g)) {
      if (!/\balt=/.test(m[0])) add(file, n, 'img without alt attribute');
    }
    // Positive tabindex breaks natural tab order.
    if (/tabIndex=\{?["']?[1-9]/.test(line)) add(file, n, 'positive tabIndex value');
    // Icon-only buttons need an accessible name.
    for (const m of line.matchAll(/<button\b([^>]*)>\s*<[A-Z][A-Za-z0-9]*\s[^>]*\/>\s*<\/button>/g)) {
      if (!/aria-label|aria-labelledby|title=/.test(m[1])) add(file, n, 'icon-only button without aria-label');
    }
    // Click handlers on non-interactive elements need a role and keyboard support.
    if (/<(div|span)\b[^>]*onClick=/.test(line) && !/role=|onKeyDown=|tabIndex=/.test(line)) {
      add(file, n, 'onClick on a non-interactive element without role/tabIndex');
    }
  });
}

// Built document: language + title.
if (existsSync('index.html')) {
  const html = readFileSync('index.html', 'utf8');
  if (!/<html[^>]+lang=/.test(html)) add('index.html', 1, 'missing lang attribute on <html>');
  if (!/<title>/.test(html)) add('index.html', 1, 'missing <title>');
}

console.log('Static accessibility check');
console.log('─'.repeat(62));
if (!findings.length) {
  console.log(`PASS  no static accessibility issues across ${files.length} components`);
} else {
  for (const f of findings.slice(0, 40)) console.log(`FINDING  ${f.file}:${f.line}  ${f.message}`);
  console.log(`${findings.length} finding(s)`);
}
console.log('─'.repeat(62));
process.exit(findings.length ? 1 : 0);
