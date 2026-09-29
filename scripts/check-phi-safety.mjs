#!/usr/bin/env node
/**
 * Privacy guardrails for the codebase.
 *
 * 1. captureError(...) may only be given allowlisted context keys, so no future
 *    call site can quietly start shipping clinical context to a monitor.
 * 2. Thrown error messages must not interpolate patient-identifying values;
 *    error text is the one field a report still carries verbatim.
 *
 * Usage: node scripts/check-phi-safety.mjs
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ALLOWED_CONTEXT = ['route', 'action', 'component', 'code'];
const PATIENT_WORDS = /(patient|name|diagnos|note|dob|mrn|admission|symptom|weight|height|address|phone|guardian|mother|father|caregiver|history|allerg)/i;

const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) out.push(p);
  }
  return out;
};

// Balanced-delimiter slice of a call's arguments.
function callArguments(source, callee) {
  const results = [];
  let index = 0;
  const needle = `${callee}(`;
  while ((index = source.indexOf(needle, index)) !== -1) {
    const start = index + needle.length;
    let depth = 1;
    let i = start;
    let quote = '';
    while (i < source.length && depth > 0) {
      const ch = source[i];
      if (quote) { if (ch === quote && source[i - 1] !== '\\') quote = ''; }
      else if (ch === '"' || ch === "'" || ch === '`') quote = ch;
      else if (ch === '(') depth += 1;
      else if (ch === ')') depth -= 1;
      i += 1;
    }
    results.push(source.slice(start, i - 1));
    index = i;
  }
  return results;
}

function splitTopLevel(text) {
  const parts = [];
  let depth = 0;
  let quote = '';
  let current = '';
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      current += ch;
      if (ch === quote && text[i - 1] !== '\\') quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; current += ch; continue; }
    if ('({['.includes(ch)) depth += 1;
    if (')}]'.includes(ch)) depth -= 1;
    if (ch === ',' && depth === 0) { parts.push(current); current = ''; continue; }
    current += ch;
  }
  parts.push(current);
  return parts;
}

const findings = [];
const add = (file, message) => findings.push({ file, message });

for (const file of walk('src')) {
  const source = readFileSync(file, 'utf8');

  for (const args of callArguments(source, 'captureError')) {
    const parts = splitTopLevel(args);
    if (parts.length < 2) continue;
    const second = parts[1].trim();
    if (!second.startsWith('{')) continue;
    const body = second.slice(1, second.lastIndexOf('}'));
    for (const entry of splitTopLevel(body)) {
      const key = entry.split(':')[0].trim().replace(/^\.\.\./, '');
      if (!key) continue;
      if (key === '...' || entry.trim().startsWith('...')) {
        add(file, 'captureError spreads an object; the keys cannot be verified as allowlisted');
        continue;
      }
      if (!ALLOWED_CONTEXT.includes(key)) {
        add(file, `captureError context key "${key}" is not allowlisted (allowed: ${ALLOWED_CONTEXT.join(', ')})`);
      }
    }
  }

  const lines = source.split('\n');
  lines.forEach((line, i) => {
    const throwMatch = /throw new (Error|TypeError|RangeError)\(`([^`]*)`\)/.exec(line);
    if (!throwMatch) return;
    const interpolations = throwMatch[2].match(/\$\{([^}]*)\}/g) || [];
    for (const raw of interpolations) {
      const expr = raw.slice(2, -1).trim();
      if (PATIENT_WORDS.test(expr)) {
        add(file, `line ${i + 1}: thrown error message interpolates "${expr}", which looks patient-related`);
      }
    }
  });
}

console.log('PHI safety guard');
console.log('─'.repeat(64));
if (!findings.length) {
  console.log('PASS  no unallowlisted monitoring context and no patient data in error messages');
} else {
  for (const f of findings) console.log(`FINDING  ${f.file}  ${f.message}`);
  console.log(`${findings.length} finding(s)`);
}
console.log('─'.repeat(64));
process.exit(findings.length ? 1 : 0);
