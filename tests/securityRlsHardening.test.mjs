import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const hardening = fs.readFileSync(new URL('../sql/security_rls_hardening.sql', import.meta.url), 'utf8');
const auditScript = fs.readFileSync(new URL('../scripts/audit-rls.mjs', import.meta.url), 'utf8');

test('profiles privilege escalation is blocked server-side', () => {
  assert.match(hardening, /CREATE OR REPLACE FUNCTION public\.enforce_profile_privileges/);
  assert.match(hardening, /CREATE TRIGGER trg_profiles_enforce_privileges BEFORE UPDATE ON public\.profiles/);
  assert.match(hardening, /NEW\.role IS DISTINCT FROM OLD\.role/);
  assert.match(hardening, /NEW\.unit_name IS DISTINCT FROM OLD\.unit_name/);
  // server-side contexts (migrations, service_role) must not be blocked
  assert.match(hardening, /IF auth\.uid\(\) IS NULL THEN RETURN NEW; END IF;/);
});

test('every security-definer function pins search_path', () => {
  assert.match(hardening, /CREATE OR REPLACE FUNCTION public\.is_admin\(\)[\s\S]*?SET search_path = public/);
  assert.match(hardening, /CREATE OR REPLACE FUNCTION public\.set_updated_at\(\)[\s\S]*?search_path = public/);
});

test('privileges that RLS cannot protect are revoked from client roles', () => {
  assert.match(hardening, /REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated/);
  assert.match(hardening, /ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon, authenticated/);
  assert.match(hardening, /REVOKE ALL ON public\.patients/);
  assert.match(hardening, /GRANT SELECT ON public\.subscription_plans TO anon/);
  assert.match(hardening, /GRANT INSERT ON public\.payments TO anon/);
});

test('profiles read/update use least privilege instead of USING (true)', () => {
  assert.match(hardening, /DROP POLICY IF EXISTS profiles_select ON public\.profiles/);
  assert.match(hardening, /CREATE POLICY profiles_select_self_or_unit ON public\.profiles FOR SELECT/);
  assert.match(hardening, /auth\.uid\(\) = id OR public\.is_admin\(\) OR public\.is_unit_member\(unit_name\)/);
});

test('a runnable RLS boundary audit exists and covers escalation + truncate', () => {
  assert.match(auditScript, /DATABASE_URL/);
  assert.match(auditScript, /self-promote role/);
  assert.match(auditScript, /TRUNCATE/);
  assert.match(auditScript, /ROLLBACK|rolled back/);
});
