import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TEDDY_BEAR_REVIEW_INDEX } from '../src/data/teddyBearReviewIndex.js';

const schema = fs.readFileSync(new URL('../sql/teddy_bear_monographs.sql', import.meta.url), 'utf8');
const seed = fs.readFileSync(new URL('../sql/teddy_bear_monographs_seed.sql', import.meta.url), 'utf8');
const reviewPage = fs.readFileSync(new URL('../src/pages/drugReview/TeddyBearReview.jsx', import.meta.url), 'utf8');

test('Teddy Bear metadata index contains the complete extracted heading count', () => {
  assert.equal(TEDDY_BEAR_REVIEW_INDEX.length, 1561);
  assert.ok(TEDDY_BEAR_REVIEW_INDEX.every((item) => item.reviewStatus === 'pending-clinical-verification'));
  assert.ok(TEDDY_BEAR_REVIEW_INDEX.every((item) => Number.isInteger(item.sourceOffset) && item.sourceOffset >= 0));
});

test('Teddy Bear private schema and seed are review-gated', () => {
  assert.match(schema, /source_id TEXT PRIMARY KEY/);
  assert.match(schema, /content TEXT NOT NULL/);
  assert.match(schema, /review_status TEXT NOT NULL DEFAULT 'pending-clinical-verification'/);
  assert.match(schema, /CREATE POLICY teddy_bear_select_unit/);
  assert.match(schema, /CREATE POLICY teddy_bear_update_reviewer/);
  assert.equal((seed.match(/'pending-clinical-verification'/g) || []).length, 1561);
  assert.match(seed, /INSERT INTO public\.teddy_bear_monographs \(source_id, name, source_file, source_offset, content, review_status\)/);
});

test('Teddy Bear review route uses authenticated Supabase content and explicit approval', () => {
  assert.match(reviewPage, /supabase\.from\('teddy_bear_monographs'\)/);
  assert.match(reviewPage, /review_status/);
  assert.match(reviewPage, /reviewer_id/);
  assert.match(reviewPage, /approved/);
  assert.match(reviewPage, /Full text is loaded from the authenticated private Supabase table/);
});
