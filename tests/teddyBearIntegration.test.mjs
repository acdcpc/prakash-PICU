import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TEDDY_BEAR_REVIEW_INDEX } from '../src/data/teddyBearReviewIndex.js';

const schema = fs.readFileSync(new URL('../sql/teddy_bear_monographs.sql', import.meta.url), 'utf8');
const seed = fs.readFileSync(new URL('../sql/teddy_bear_monographs_seed.sql', import.meta.url), 'utf8');
const reviewPage = fs.readFileSync(new URL('../src/pages/drugReview/TeddyBearReview.jsx', import.meta.url), 'utf8');
const drugCalcPage = fs.readFileSync(new URL('../src/pages/calculators/DrugCalc.jsx', import.meta.url), 'utf8');
const recordKindMigration = fs.readFileSync(new URL('../sql/teddy_bear_record_kind.sql', import.meta.url), 'utf8');
const seedImporter = fs.readFileSync(new URL('../scripts/import-teddy-bear-seed.mjs', import.meta.url), 'utf8');

test('Teddy Bear metadata index contains the complete drug monograph count', () => {
  assert.equal(TEDDY_BEAR_REVIEW_INDEX.length, 238);
  assert.ok(TEDDY_BEAR_REVIEW_INDEX.every((item) => item.reviewStatus === 'pending-clinical-verification'));
  assert.ok(TEDDY_BEAR_REVIEW_INDEX.every((item) => Number.isInteger(item.sourceOffset) && item.sourceOffset >= 0));
});

test('Teddy Bear private schema and seed are review-gated', () => {
  assert.match(schema, /source_id TEXT PRIMARY KEY/);
  assert.match(schema, /content TEXT NOT NULL/);
  assert.match(schema, /review_status TEXT NOT NULL DEFAULT 'pending-clinical-verification'/);
  assert.match(schema, /CREATE POLICY teddy_bear_select_unit/);
  assert.match(schema, /CREATE POLICY teddy_bear_update_reviewer/);
  assert.equal((seed.match(/'pending-clinical-verification'/g) || []).length, 238);
  assert.match(seed, /INSERT INTO public\.teddy_bear_monographs \(source_id, name, source_file, source_offset, content, review_status\)/);
});

test('Teddy Bear dose calculator exposes the complete reference index without auto-promotion', () => {
  assert.match(drugCalcPage, /TEDDY_BEAR_REVIEW_INDEX/);
  assert.match(drugCalcPage, /All Teddy Bear monographs/);
  assert.match(drugCalcPage, /not auto-calculated/);
  assert.match(drugCalcPage, /teddy-bear-review\?source_id=/);
});

test('Teddy Bear review route uses authenticated Supabase content and explicit approval', () => {
  assert.match(reviewPage, /supabase\.from\('teddy_bear_monographs'\)/);
  assert.match(reviewPage, /review_status/);
  assert.match(reviewPage, /reviewer_id/);
  assert.match(reviewPage, /approved/);
  assert.match(reviewPage, /Full text is loaded from the authenticated private Supabase table/);
  assert.match(reviewPage, /Approve reviewed record/);
  assert.match(reviewPage, /Flag for clinical review/);
  assert.match(reviewPage, /saveReview\('approved'\)/);
  assert.match(reviewPage, /saveReview\('in-review'\)/);
});

test('Teddy Bear review queue is classifiable and filterable', () => {
  assert.match(recordKindMigration, /ADD COLUMN IF NOT EXISTS record_kind/);
  assert.match(recordKindMigration, /'monograph', 'section', 'reference'/);
  assert.match(recordKindMigration, /ELSE 'monograph'/);
  assert.match(recordKindMigration, /record_kind_locked BOOLEAN NOT NULL DEFAULT false/);
  assert.match(recordKindMigration, /WHERE record_kind_locked = false/);
  assert.match(recordKindMigration, /record_kind_locked = true/);
  assert.match(reviewPage, /record_kind/);
  assert.match(reviewPage, /kindFilter/);
  assert.match(reviewPage, /Drug monographs/);
});

test('Teddy Bear seed importer requires a private SSL database URL and fail-fast psql', () => {
  assert.match(seedImporter, /process\.env\.DATABASE_URL/);
  assert.match(seedImporter, /sslmode=require/);
  assert.match(seedImporter, /ON_ERROR_STOP=1/);
  assert.match(seedImporter, /spawnSync\('psql'/);
  assert.match(seedImporter, /expected 238 full monographs/);
});

