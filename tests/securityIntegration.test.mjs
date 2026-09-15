import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeAuditPatientId, sanitizeAuditMetadata } from '../src/lib/auditValidation.js';

const migration = fs.readFileSync(new URL('../sql/security_hardening.sql', import.meta.url), 'utf8');
const pediatricWorkflow = fs.readFileSync(new URL('../sql/pediatric_clinician_workflow.sql', import.meta.url), 'utf8');
const imagePage = fs.readFileSync(new URL('../src/pages/notes/Images.jsx', import.meta.url), 'utf8');
const emergencyPage = fs.readFileSync(new URL('../src/pages/emergency/EmergencyMode.jsx', import.meta.url), 'utf8');
const infusionPage = fs.readFileSync(new URL('../src/pages/highRiskInfusions/HighRiskInfusions.jsx', import.meta.url), 'utf8');

test('security migration defines unit membership and audit constraints', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.unit_memberships/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.clinical_audit_events/);
  assert.match(migration, /event_type TEXT NOT NULL CHECK \(event_type IN \('emergency_dose_calculated', 'emergency_self_recheck', 'high_risk_infusion_self_recheck'\)\)/);
  assert.match(migration, /actor_id UUID NOT NULL REFERENCES auth\.users\(id\)/);
  assert.match(migration, /patient_id UUID REFERENCES public\.patients\(id\) ON DELETE SET NULL/);
  assert.match(migration, /actor_id = auth\.uid\(\)/);
  assert.match(migration, /public\.is_unit_member\(unit_name\)/);
});

test('pediatric workflow enforces owner-scoped patient records and removes bed requirements', () => {
  assert.match(pediatricWorkflow, /ALTER TABLE public\.patients ALTER COLUMN bed_number DROP NOT NULL/);
  assert.match(pediatricWorkflow, /ADD COLUMN IF NOT EXISTS source_type/);
  assert.match(pediatricWorkflow, /ADD COLUMN IF NOT EXISTS date_of_birth_bs/);
  assert.match(pediatricWorkflow, /created_by = auth\.uid\(\)/);
  assert.match(pediatricWorkflow, /CREATE POLICY pts_select_owner/);
  assert.match(pediatricWorkflow, /CREATE POLICY pts_delete_owner/);
  assert.match(pediatricWorkflow, /CREATE POLICY fb_select_owner/);
});

test('private image migration and client flow avoid public URLs', () => {
  assert.match(migration, /UPDATE storage\.buckets SET public = false WHERE id = 'patient-images'/);
  assert.match(migration, /CREATE POLICY patient_images_select ON storage\.objects/);
  assert.match(migration, /CREATE POLICY patient_images_upload ON storage\.objects/);
  assert.match(imagePage, /storage_path: filePath/);
  assert.match(imagePage, /createSignedUrl\(image\.storage_path, 60 \* 60\)/);
  assert.doesNotMatch(imagePage, /getPublicUrl/);
});

test('audit helper accepts only UUID-shaped patient references', () => {
  const valid = '123e4567-e89b-12d3-a456-426614174000';
  assert.equal(normalizeAuditPatientId(valid), valid);
  assert.equal(normalizeAuditPatientId('bed-1'), null);
  assert.equal(normalizeAuditPatientId('patient name'), null);
  assert.equal(normalizeAuditPatientId(''), null);
});

test('audit metadata is allowlisted and excludes free text PHI fields', () => {
  const safe = sanitizeAuditMetadata({ route: 'IV', indication: 'shock', reference: 'sccm-ped-sepsis', patientName: 'should-not-pass', diagnosis: 'should-not-pass', notes: 'should-not-pass' });
  assert.deepEqual(safe, { route: 'IV', indication: 'shock', reference: 'sccm-ped-sepsis' });
});

test('clinical screens are wired to audit calculation and self-recheck events', () => {
  assert.match(emergencyPage, /eventType: 'emergency_dose_calculated'/);
  assert.match(emergencyPage, /eventType: 'emergency_self_recheck'/);
  assert.match(infusionPage, /eventType: 'high_risk_infusion_self_recheck'/);
});

test('audit events are append-only and enforce an allowlisted metadata shape', () => {
  const audit = fs.readFileSync(new URL('../sql/audit_hardening.sql', import.meta.url), 'utf8');
  const hardening = fs.readFileSync(new URL('../sql/security_hardening.sql', import.meta.url), 'utf8');
  // append-only: the table has no UPDATE/DELETE policies
  assert.doesNotMatch(hardening, /clinical_audit_events FOR UPDATE/);
  assert.doesNotMatch(hardening, /clinical_audit_events FOR DELETE/);
  // defence in depth for free-text fields and metadata keys
  assert.match(audit, /clinical_audit_drug_name_len/);
  assert.match(audit, /clinical_audit_dose_unit_len/);
  assert.match(audit, /CREATE OR REPLACE FUNCTION public\.enforce_audit_metadata_keys/);
  assert.match(audit, /'route', 'frequency', 'indication', 'reference', 'source', 'verification_stage'/);
  assert.match(audit, /CREATE TRIGGER trg_audit_metadata_keys BEFORE INSERT ON public\.clinical_audit_events/);
});

test('analytics never receives patient identifiers', () => {
  const privacy = fs.readFileSync(new URL('../src/lib/analyticsPrivacy.js', import.meta.url), 'utf8');
  const analytics = fs.readFileSync(new URL('../src/lib/analytics.js', import.meta.url), 'utf8');
  assert.match(privacy, /sanitizeAnalyticsPath/);
  assert.match(privacy, /:id/);
  assert.match(analytics, /sanitizeAnalyticsPath\(page\)/);
});
