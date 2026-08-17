#!/usr/bin/env node
// Extracts the authorized Teddy Bear PDF and indexes only the drug
// monographs (not abbreviations, front matter, TOC lines, or sub-sections).
// A drug monograph start is a capitalized heading line whose next line
// begins with "Brand names" (the first section of every Teddy Bear monograph).
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

const input = process.argv[2];
const outputDir = resolve(process.argv[3] || '.clinical-private/drug-reference');
if (!input) {
  console.error('Usage: node scripts/ingest-teddy-bear.mjs /path/to/licensed/Teddybear.pdf [private-output-dir]');
  process.exit(1);
}
mkdirSync(outputDir, { recursive: true });
const textPath = resolve(outputDir, 'source.txt');
execFileSync('pdftotext', ['-layout', resolve(input), textPath]);
const text = readFileSync(textPath, 'utf8');

// Precompute the byte offset of each line.
const lines = text.split('\n');
const offsets = [];
let running = 0;
for (const line of lines) { offsets.push(running); running += line.length + 1; }

// Detect drug monograph starts.
const starts = [];
for (let i = 0; i < lines.length - 1; i++) {
  const name = lines[i].trim();
  const next = lines[i + 1].trim();
  if (/^[A-Z][A-Za-z0-9()/+,. -]{1,70}$/.test(name) && /^Brand names\b/i.test(next)) {
    starts.push({ name, offset: offsets[i] });
  }
}

// De-duplicate and assign stable slug ids.
const seen = new Set();
const monographs = [];
for (const s of starts) {
  let slug = s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  let id = slug;
  let n = 2;
  while (seen.has(id)) id = `${slug}-${n++}`;
  seen.add(id);
  monographs.push({ id, name: s.name, sourceOffset: s.offset });
}

const index = {
  source: basename(input),
  generatedAt: new Date().toISOString(),
  licenseNotice: 'Private local output only. Do not commit or redistribute copyrighted monograph text.',
  monographs,
};
writeFileSync(resolve(outputDir, 'monograph-index.json'), JSON.stringify(index, null, 2));
console.log(`Indexed ${monographs.length} drug monographs from ${input}. Output: ${dirname(resolve(outputDir))}`);
