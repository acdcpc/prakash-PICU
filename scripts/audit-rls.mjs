#!/usr/bin/env node
/**
 * Live RLS / least-privilege boundary audit.
 *
 * Usage:
 *   DATABASE_URL='postgresql://...' node scripts/audit-rls.mjs
 *
 * Impersonates client roles (anon / authenticated + JWT `sub`) and checks that
 * unauthenticated users, other users, and same-user escalation attempts are
 * denied. All mutating probes run inside a transaction and are rolled back, so
 * the audit never changes data.
 */
import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required (private connection string).');
  process.exit(1);
}

const c = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
await c.connect();

const reset = async () => { await c.query('ROLLBACK').catch(() => {}); await c.query('RESET ROLE'); await c.query(`SELECT set_config('request.jwt.claims', '', false)`); };
const asClient = async (role, sub) => {
  await c.query(`SET ROLE ${role}`);
  if (sub) await c.query(`SELECT set_config('request.jwt.claims', $1, false)`, [JSON.stringify({ sub, role })]);
};
const probe = async (role, sub, sql, params) => {
  await asClient(role, sub);
  try { const r = await c.query(sql, params); return r.rows?.[0]?.n ?? r.rowCount; }
  catch (e) { return 'denied:' + e.code; }
  finally { await reset(); }
};

const admin = (await c.query(`SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1`)).rows[0]?.id;
const other = '11111111-2222-3333-4444-555555555555';
const results = [];
const check = (label, actual, pass) => results.push({ label, actual, pass });

check('anon cannot read patients', await probe('anon', null, 'SELECT count(*)::int n FROM public.patients'), (v) => v === 0 || String(v).startsWith('denied'));
check('anon cannot read private monograph table', await probe('anon', null, 'SELECT count(*)::int n FROM public.teddy_bear_monographs'), (v) => v === 0 || String(v).startsWith('denied'));
check('anon cannot read staff profiles', await probe('anon', null, 'SELECT count(*)::int n FROM public.profiles'), (v) => v === 0 || String(v).startsWith('denied'));
check('other user cannot read another clinician prefs', await probe('authenticated', other, 'SELECT count(*)::int n FROM public.user_preferences'), (v) => v === 0);

// Privilege escalation attempts. The target is temporarily demoted to a
// non-admin role inside a transaction that is rolled back, so the real account
// is never modified and a genuine clinician context is exercised.
const escalationProbe = async (sql, params) => {
  await c.query('BEGIN');
  await c.query(`UPDATE public.profiles SET role = 'doctor' WHERE id = $1`, [admin]);
  await asClient('authenticated', admin);
  let outcome;
  try { const r = await c.query(sql, params); outcome = r.rowCount ? 'allowed' : 'no rows'; }
  catch (e) { outcome = 'denied:' + e.code; }
  await c.query('ROLLBACK');
  await c.query('RESET ROLE');
  await c.query(`SELECT set_config('request.jwt.claims', '', false)`);
  return outcome;
};
check('clinician cannot self-promote role', await escalationProbe(`UPDATE public.profiles SET role = 'admin' WHERE id = $1`, [admin]), (v) => String(v).startsWith('denied'));
check('clinician cannot change own unit', await escalationProbe(`UPDATE public.profiles SET unit_name = 'HACKED' WHERE id = $1`, [admin]), (v) => String(v).startsWith('denied'));

check('TRUNCATE is not granted to public client roles', (await c.query(`SELECT has_table_privilege('anon','public.patients','TRUNCATE')::text a, has_table_privilege('authenticated','public.patients','TRUNCATE')::text b`)).rows[0], (v) => v.a === 'false' && v.b === 'false');
check('anon retains only the public plan list', (await c.query(`SELECT has_table_privilege('anon','public.subscription_plans','SELECT')::text a`)).rows[0].a, (v) => v === 'true');

await c.end();

console.log('\nRLS boundary audit');
console.log('─'.repeat(64));
let failed = 0;
for (const r of results) {
  const pass = typeof r.pass === 'function' ? r.pass(r.actual) : Boolean(r.pass);
  if (!pass) failed += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${r.label.padEnd(46)} ${JSON.stringify(r.actual)}`);
}
console.log('─'.repeat(64));
console.log(`${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
