#!/usr/bin/env node
// Reports built asset sizes so bundle growth is visible per route/chunk.
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'dist/assets';
let files;
try { files = readdirSync(dir); } catch { console.error('Run `npm run build` first (no dist/assets).'); process.exit(1); }

const rows = files
  .filter((f) => f.endsWith('.js') || f.endsWith('.css'))
  .map((f) => ({ name: f, bytes: statSync(join(dir, f)).size }))
  .sort((a, b) => b.bytes - a.bytes);

const total = rows.reduce((sum, r) => sum + r.bytes, 0);
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
console.log('Bundle report (dist/assets)');
console.log('─'.repeat(58));
for (const r of rows.slice(0, 20)) console.log(`${kb(r.bytes).padStart(10)}  ${r.name}`);
console.log('─'.repeat(58));
console.log(`${kb(total).padStart(10)}  total across ${rows.length} assets`);
console.log('\nLargest chunk above is a candidate for route-level code splitting.');
