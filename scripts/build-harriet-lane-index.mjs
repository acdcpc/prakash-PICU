#!/usr/bin/env node
// Compiles the metadata-only Neonate (Harriet Lane) review index from the
// private monograph index JSON produced by ingest-harriet-lane.mjs.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const inputPath = resolve(process.argv[2] || '.clinical-private/harriet-lane/monograph-index.json');
const outputPath = resolve(process.argv[3] || 'src/data/harrietLaneReviewIndex.js');
const source = JSON.parse(readFileSync(inputPath, 'utf8'));
const records = source.monographs.map((item) => ({
  id: item.id,
  name: item.name,
  sourceOffset: item.sourceOffset,
  reviewStatus: 'pending-clinical-verification',
  source: source.source,
}));
const output = `// Metadata-only Neonate index generated from an authorized private Harriet Lane PDF.\n// No monograph text, dose prose, or copyrighted tables are included here.\n// Every record requires clinical-team verification before use.\nexport const HARRIET_LANE_REVIEW_SOURCE = ${JSON.stringify({ source: source.source, generatedAt: source.generatedAt, licenseNotice: source.licenseNotice }, null, 2)};\n\nexport const HARRIET_LANE_REVIEW_INDEX = ${JSON.stringify(records, null, 2)};\n`;
writeFileSync(outputPath, output);
console.log(`Compiled ${records.length} metadata-only Neonate review records to ${outputPath}`);
