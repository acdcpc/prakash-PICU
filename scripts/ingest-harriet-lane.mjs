#!/usr/bin/env node
// Extracts drug monographs from the authorized Harriet Lane Handbook PDF
// (Part IV Formulary, Chapter 31 Drug Dosages) for the Neonate reference.
// Drug monograph headings are ALL-CAPS lines indented two spaces; adjacent
// ALL-CAPS lines are merged (multi-line drug names).
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

const input = process.argv[2];
const outputDir = resolve(process.argv[3] || '.clinical-private/harriet-lane');
if (!input) {
  console.error('Usage: node scripts/ingest-harriet-lane.mjs /path/to/licensed/HarrietLane.pdf [private-output-dir]');
  process.exit(1);
}
mkdirSync(outputDir, { recursive: true });
const textPath = resolve(outputDir, 'source.txt');
execFileSync('pdftotext', ['-layout', resolve(input), textPath]);
const text = readFileSync(textPath, 'utf8');
const lines = text.split('\n');

const offsets = [];
let running = 0;
for (const line of lines) { offsets.push(running); running += line.length + 1; }

// Bound the formulary: after the "840  Part IV Formulary" page marker, and
// before Chapter 32 (the next chapter that follows the drug dosage monographs).
const startMarker = lines.findIndex((l) => /^\s*840\s+Part IV\s+Formulary\s*$/.test(l));
const endMarker = lines.findIndex((l, i) => i > startMarker && /^\s*Chapter 32\s*$/.test(l));
if (startMarker < 0 || endMarker < 0) {
  console.error('Could not locate the Part IV Formulary region (page 840 .. Chapter 32).');
  process.exit(1);
}

const headingRe = /^  ([A-Z][A-Z0-9,'()\/+\-.–—― ]{2,60})$/;
const candidates = [];
for (let i = startMarker; i < endMarker; i++) {
  const m = lines[i].match(headingRe);
  if (m) candidates.push({ name: m[1].trim(), line: i });
}

// Merge adjacent ALL-CAPS lines (drug names split across lines).
const merged = [];
for (const c of candidates) {
  const last = merged[merged.length - 1];
  if (last && c.line === last.endLine + 1) {
    last.name = `${last.name} ${c.name}`;
    last.endLine = c.line;
  } else {
    merged.push({ name: c.name, startLine: c.line, endLine: c.line });
  }
}

const seen = new Set();
const monographs = [];
for (const mm of merged) {
  let slug = mm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  let id = slug, n = 2;
  while (seen.has(id)) id = `${slug}-${n++}`;
  seen.add(id);
  monographs.push({ id, name: mm.name, sourceOffset: offsets[mm.startLine] });
}

const index = {
  source: basename(input),
  generatedAt: new Date().toISOString(),
  licenseNotice: 'Private local output only. Do not commit or redistribute copyrighted monograph text.',
  monographs,
};
writeFileSync(resolve(outputDir, 'monograph-index.json'), JSON.stringify(index, null, 2));
console.log(`Indexed ${monographs.length} drug monographs from ${input}. Output: ${dirname(resolve(outputDir))}`);
