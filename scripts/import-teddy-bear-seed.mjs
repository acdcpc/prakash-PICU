#!/usr/bin/env node
/**
 * Import the institution-authorized Teddy Bear seed through psql.
 *
 * Usage:
 *   DATABASE_URL='postgresql://...?...sslmode=require' \
 *     node scripts/import-teddy-bear-seed.mjs [seed-file]
 *
 * The URL is intentionally read from the environment rather than printed or
 * accepted as a command-line argument, where it could appear in shell history.
 */
import { existsSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const seedPath = resolve(process.argv[2] || 'sql/teddy_bear_monographs_seed.sql');
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is required and must be a private Supabase PostgreSQL URI.');
  process.exit(1);
}
if (!databaseUrl.includes('sslmode=require')) {
  console.error('DATABASE_URL must include sslmode=require for a hosted Supabase database.');
  process.exit(1);
}
if (!existsSync(seedPath)) {
  console.error(`Seed file not found: ${seedPath}`);
  process.exit(1);
}
if (statSync(seedPath).size < 1024) {
  console.error(`Seed file is unexpectedly small: ${seedPath}`);
  process.exit(1);
}

const runPsql = (args, options = {}) => spawnSync('psql', [databaseUrl, '--set=ON_ERROR_STOP=1', ...args], {
  ...options,
  shell: false,
});

const importResult = runPsql(['--file', seedPath], { stdio: 'inherit' });
if (importResult.error) {
  console.error(`Could not start psql: ${importResult.error.message}`);
  process.exit(1);
}
if (importResult.status !== 0) {
  console.error(`Teddy Bear seed import failed with exit code ${importResult.status ?? 1}.`);
  process.exit(importResult.status || 1);
}

const verification = runPsql([
  '--tuples-only',
  '--no-align',
  '--command',
  "SELECT count(*), count(*) FILTER (WHERE review_status = 'pending-clinical-verification'), count(*) FILTER (WHERE content IS NULL OR length(content) = 0) FROM public.teddy_bear_monographs;",
], { encoding: 'utf8' });
if (verification.error || verification.status !== 0) {
  console.error('Seed import completed, but verification could not be run. Check the table manually.');
  process.exit(1);
}

const [countText, pendingText, emptyText] = verification.stdout.trim().split('|').map((value) => value.trim());
const count = Number(countText);
const pending = Number(pendingText);
const empty = Number(emptyText);
console.log(`Verified Teddy Bear rows: ${count}; pending: ${pending}; empty content: ${empty}.`);
if (count !== 238 || empty !== 0) {
  console.error('Unexpected verification result: expected 238 full monographs and zero empty-content rows.');
  process.exit(1);
}
console.log('Teddy Bear seed import completed successfully. Clinical approval is still required before calculator promotion.');
