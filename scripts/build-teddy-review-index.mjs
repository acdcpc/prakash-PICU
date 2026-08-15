#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const inputPath = resolve(process.argv[2] || '.clinical-private/drug-reference/monograph-index.json');
const outputPath = resolve(process.argv[3] || 'src/data/teddyBearReviewIndex.js');
const source = JSON.parse(readFileSync(inputPath, 'utf8'));
const records = source.monographs.map((item) => ({
  id: item.id,
  name: item.name,
  sourceOffset: item.sourceOffset,
  reviewStatus: 'pending-clinical-verification',
  source: source.source,
}));
const output = `// Metadata-only index generated from an authorized private Teddy Bear PDF.\n// No monograph text, dose prose, or copyrighted tables are included here.\n// Every record requires clinical-team verification before use.\nexport const TEDDY_BEAR_REVIEW_SOURCE = ${JSON.stringify({ source: source.source, generatedAt: source.generatedAt, licenseNotice: source.licenseNotice }, null, 2)};\n\nexport const TEDDY_BEAR_REVIEW_INDEX = ${JSON.stringify(records, null, 2)};\n`;
writeFileSync(outputPath, output);
console.log(`Compiled ${records.length} metadata-only review records to ${outputPath}`);
