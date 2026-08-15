#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const inputPath = resolve(process.argv[2] || '.clinical-private/drug-reference/source.txt');
const indexPath = resolve(process.argv[3] || '.clinical-private/drug-reference/monograph-index.json');
const outputPath = resolve(process.argv[4] || 'sql/teddy_bear_monographs.sql');
const text = readFileSync(inputPath, 'utf8');
const source = JSON.parse(readFileSync(indexPath, 'utf8'));
const orderedMonographs = [...source.monographs].sort((a, b) => Number(a.sourceOffset) - Number(b.sourceOffset));

function dollarQuote(value, seed) {
  let tag = `teddy_${seed}`;
  while (value.includes(`$${tag}$`)) tag += '_x';
  return `$${tag}$${value}$${tag}$`;
}

function row(item, position) {
  const start = Number(item.sourceOffset) || 0;
  const next = orderedMonographs[position + 1];
  const end = next ? Number(next.sourceOffset) || text.length : text.length;
  const content = text.slice(start, end).trim();
  return `  (${dollarQuote(item.id, `${position}_id`)}, ${dollarQuote(item.name, `${position}_name`)}, ${dollarQuote(source.source, `${position}_source`)}, ${start}, ${dollarQuote(content, position)}, 'pending-clinical-verification')`;
}

const header = `-- Generated from an institution-authorized Teddy Bear PDF.\n-- Full monograph content is intended for private institutional Supabase use only.\n-- Do not expose this table through public routes or public storage.\n-- Every row remains pending clinical verification until approved by the institution.\n\n`;
const columns = '(source_id, name, source_file, source_offset, content, review_status)';
const rows = orderedMonographs.map(row).join(',\\n');
const sql = `${header}INSERT INTO public.teddy_bear_monographs ${columns}\nVALUES\n${rows}\nON CONFLICT (source_id) DO UPDATE SET\n  name = EXCLUDED.name,\n  source_file = EXCLUDED.source_file,\n  source_offset = EXCLUDED.source_offset,\n  content = EXCLUDED.content,\n  review_status = CASE WHEN public.teddy_bear_monographs.review_status = 'approved' THEN public.teddy_bear_monographs.review_status ELSE EXCLUDED.review_status END;\n`;
writeFileSync(outputPath, sql);
console.log(`Compiled ${orderedMonographs.length} full-text monograph rows to ${outputPath}`);
