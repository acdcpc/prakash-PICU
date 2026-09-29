#!/usr/bin/env node
/**
 * public/_headers is the single source of truth for security headers (Netlify
 * format). This script translates it into vercel.json so both hosting options
 * ship identical headers. Run `npm run sync:headers` after editing _headers;
 * CI runs it with --check to catch drift.
 *
 *   node scripts/sync-vercel-headers.mjs          regenerate vercel.json
 *   node scripts/sync-vercel-headers.mjs --check  fail if vercel.json is stale
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const sourcePath = 'public/_headers';
const targetPath = 'vercel.json';

function parseNetlifyHeaders(text) {
  const blocks = [];
  let current = null;
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!line.startsWith(' ') && line.trim()) {
      if (current) blocks.push(current);
      // Netlify's catch-all is "/*"; Vercel expects the path-to-regexp form.
      const raw = line.trim();
      current = { source: raw === '/*' ? '/(.*)' : raw, headers: [] };
      continue;
    }
    const entry = line.trim();
    const split = entry.indexOf(':');
    if (current && split > 0) {
      current.headers.push({ key: entry.slice(0, split).trim(), value: entry.slice(split + 1).trim() });
    }
  }
  if (current) blocks.push(current);
  return blocks;
}

const parsed = parseNetlifyHeaders(readFileSync(sourcePath, 'utf8'));
if (!parsed.length || !parsed[0].headers.length) {
  console.error('Could not parse any headers from public/_headers');
  process.exit(1);
}

const existing = existsSync(targetPath) ? JSON.parse(readFileSync(targetPath, 'utf8')) : {};
const next = {
  ...existing,
  framework: existing.framework || 'vite',
  buildCommand: existing.buildCommand || 'npm run build',
  outputDirectory: existing.outputDirectory || 'dist',
  rewrites: existing.rewrites || [{ source: '/(.*)', destination: '/index.html' }],
  headers: parsed,
};

const check = process.argv.includes('--check');
if (check) {
  const stale = JSON.stringify(existing.headers) !== JSON.stringify(parsed);
  if (!existsSync(targetPath) || stale) {
    console.error('vercel.json headers are out of date with public/_headers - run: npm run sync:headers');
    process.exit(1);
  }
  console.log(`vercel.json headers match public/_headers (${parsed.reduce((n, b) => n + b.headers.length, 0)} headers)`);
  process.exit(0);
}

writeFileSync(targetPath, `${JSON.stringify(next, null, 2)}\n`);
console.log(`vercel.json written from public/_headers (${parsed.length} path block(s))`);
