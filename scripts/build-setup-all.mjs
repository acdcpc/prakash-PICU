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
  { file: 'sql/security_rls_hardening.sql', title: 'RLS & LEAST-PRIVILEGE HARDENING' },
  { file: 'sql/storage_path_hardening.sql', title: 'PRIVATE IMAGE PATH HARDENING' },
  { file: 'sql/audit_hardening.sql', title: 'APPEND-ONLY AUDIT HARDENING' },
  { file: 'sql/payment_screenshots.sql', title: 'PAYMENT SCREENSHOTS BUCKET' },
  { file: 'sql/teddy_bear_monographs.sql', title: 'TEDDY BEAR MONOGRAPH TABLE' },
  { file: 'sql/teddy_bear_record_kind.sql', title: 'TEDDY BEAR RECORD KIND' },
  { file: 'sql/harriet_lane_monographs.sql', title: 'NEONATE MONOGRAPH TABLE (HARRIET LANE)' },
  { file: 'sql/pediatric_clinician_workflow.sql', title: 'PEDIATRIC CLINICIAN WORKFLOW' },
  { file: 'sql/onboarding_preferences.sql', title: 'ONBOARDING PREFERENCES (NON-PHI)' },
  { file: 'sql/grants.sql', title: 'ROLE GRANTS' },
];

const header = `-- ============================================================
--  OurPICU — COMBINED ONE-PASTE DATABASE SETUP
--  FIRST INSTALL ONLY: paste this file into a staging Supabase project and run ONCE.
--  Do NOT blindly rerun it on an existing production project; some base-schema
--  objects are intentionally not repeat-safe. Use individual migrations for upgrades.
--  Apply order:
--    core schema -> payment -> security hardening -> storage bucket
--    -> teddy bear monograph table -> record kind -> neonate monograph table -> clinician workflow -> grants
--  FULL-TEXT SEED: sql/teddy_bear_monographs_seed.sql (~3.4 MB) is applied
--    SEPARATELY after this file — it is too large for the SQL Editor.
--    Apply it after this file with: DATABASE_URL=... npm run import:teddy-seed
--    The importer runs psql with ON_ERROR_STOP and verifies 238 rows before
--    opening the review route. Never paste the full seed into the SQL Editor.
--  NOTE: do NOT also run the individual files separately after running this
--  first-install file unless you are following the staged production checklist.
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
