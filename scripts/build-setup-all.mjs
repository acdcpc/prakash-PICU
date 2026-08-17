#!/usr/bin/env node
// Regenerates sql/SETUP_ALL.sql from the individual migration files so the
// one-paste file cannot drift from the source-of-truth SQL files.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Dependency-aware apply order. The full-text seed is intentionally excluded:
// it is ~3.4 MB and too large for the Supabase SQL Editor.
const sections = [
  { file: 'sql/migration.sql', title: 'CORE SCHEMA' },
  { file: 'sql/subscriptions.sql', title: 'PAYMENT SYSTEM' },
  { file: 'sql/security_hardening.sql', title: 'SECURITY HARDENING' },
  { file: 'sql/payment_screenshots.sql', title: 'PAYMENT SCREENSHOTS BUCKET' },
  { file: 'sql/teddy_bear_monographs.sql', title: 'TEDDY BEAR MONOGRAPH TABLE' },
  { file: 'sql/teddy_bear_record_kind.sql', title: 'TEDDY BEAR RECORD KIND' },
  { file: 'sql/pediatric_clinician_workflow.sql', title: 'PEDIATRIC CLINICIAN WORKFLOW' },
  { file: 'sql/grants.sql', title: 'ROLE GRANTS' },
];

const header = `-- ============================================================
--  OurPICU — COMBINED ONE-PASTE DATABASE SETUP
--  Paste this ENTIRE file into the Supabase SQL Editor and run ONCE.
--  Apply order:
--    core schema -> payment -> security hardening -> storage bucket
--    -> teddy bear monograph table -> record kind -> clinician workflow -> grants
--  FULL-TEXT SEED: sql/teddy_bear_monographs_seed.sql (~3.4 MB) is applied
--    SEPARATELY after this file — it is too large for the SQL Editor.
--    Apply it right after the "TEDDY BEAR MONOGRAPH TABLE" section via the
--    chunked import script before opening the review route.
--  NOTE: do NOT also run the individual files separately after running this.
-- ============================================================

`;

const parts = [header];
sections.forEach((s, i) => {
  const content = readFileSync(resolve(root, s.file), 'utf8').replace(/\s+$/, '\n');
  parts.push(`-- ───────────────────────── [${i + 1}] ${s.title} (${s.file}) ─────────────────────────\n\n`);
  parts.push(content + '\n');
});

writeFileSync(resolve(root, 'sql/SETUP_ALL.sql'), parts.join(''));
console.log(`Generated sql/SETUP_ALL.sql with ${sections.length} sections.`);
