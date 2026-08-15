#!/usr/bin/env node
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
const headings = [];
const headingPattern = /^\s{0,4}([A-Z][A-Za-z0-9()/+,. -]{2,80})\s*$/gm;
let match;
while ((match = headingPattern.exec(text))) {
  const name = match[1].trim();
  if (!/^(TABLE OF CONTENTS|INDEX|PEDIATRIC INJECTABLE DRUGS|ELEVENTH EDITION)$/i.test(name) && !/^Page \d+$/i.test(name)) headings.push({ name, offset: match.index });
}
const unique = [...new Map(headings.map((item) => [item.name.toLowerCase(), item])).values()];
const index = { source: basename(input), generatedAt: new Date().toISOString(), licenseNotice: 'Private local output only. Do not commit or redistribute copyrighted monograph text.', monographs: unique.map((item, index) => ({ id: `${index + 1}-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, name: item.name, sourceOffset: item.offset })) };
writeFileSync(resolve(outputDir, 'monograph-index.json'), JSON.stringify(index, null, 2));
console.log(`Indexed ${index.monographs.length} headings from ${input}. Output: ${dirname(resolve(outputDir))}`);
