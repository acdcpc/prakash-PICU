import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { HARRIET_LANE_REVIEW_INDEX } from '../src/data/harrietLaneReviewIndex.js';

const schema = fs.readFileSync(new URL('../sql/harriet_lane_monographs.sql', import.meta.url), 'utf8');
const seed = fs.readFileSync(new URL('../sql/harriet_lane_monographs_seed.sql', import.meta.url), 'utf8');
const reviewPage = fs.readFileSync(new URL('../src/pages/drugReview/HarrietLaneReview.jsx', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const sidebar = fs.readFileSync(new URL('../src/components/Sidebar.jsx', import.meta.url), 'utf8');

test('Neonate metadata index contains the complete drug monograph count', () => {
  assert.equal(HARRIET_LANE_REVIEW_INDEX.length, 458);
  assert.ok(HARRIET_LANE_REVIEW_INDEX.every((item) => item.reviewStatus === 'pending-clinical-verification'));
  assert.ok(HARRIET_LANE_REVIEW_INDEX.every((item) => Number.isInteger(item.sourceOffset) && item.sourceOffset >= 0));
});

test('Neonate private schema and seed are review-gated', () => {
  assert.match(schema, /source_id TEXT PRIMARY KEY/);
  assert.match(schema, /content TEXT NOT NULL/);
  assert.match(schema, /review_status TEXT NOT NULL DEFAULT 'pending-clinical-verification'/);
  assert.match(schema, /CREATE POLICY harriet_lane_select_unit/);
  assert.match(schema, /CREATE POLICY harriet_lane_update_reviewer/);
  assert.equal((seed.match(/'pending-clinical-verification'/g) || []).length, 458);
  assert.match(seed, /INSERT INTO public\.harriet_lane_monographs \(source_id, name, source_file, source_offset, content, review_status\)/);
});

test('Neonate route, tab, and authenticated review page are wired', () => {
  assert.match(app, /neonate-review/);
  assert.match(app, /HarrietLaneReview/);
  assert.match(sidebar, /Neonate Formulary/);
  assert.match(reviewPage, /supabase\.from\('harriet_lane_monographs'\)/);
  assert.match(reviewPage, /HARRIET_LANE_REVIEW_INDEX/);
  assert.match(reviewPage, /Approve reviewed record/);
});
