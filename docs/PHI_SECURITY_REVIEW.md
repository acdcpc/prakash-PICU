# PHI security review and Emergency Mode simulation

## Review scope

This review covers the current Emergency Mode calculation logic, the browser persistence call sites, the core Supabase RLS policies in `sql/migration.sql`, subscription RLS in `sql/subscriptions.sql`, and the patient image storage policies.

## Emergency Mode simulation

The simulation test is `tests/emergencySimulation.test.mjs`. It exercises every current Emergency Mode drug across eight pediatric age bands and 25 representative weights from 0.3 kg through 150 kg, including extremely preterm reference weights, term neonates, infants, toddlers, school-age children, and adolescents. It checks finite positive results, maximum caps, monotonic behavior as weight increases, and rejection of invalid weights and malformed drug records.

The simulation currently covers 325 drug-weight cases, plus monotonicity and invalid-input cases. It is a mathematical regression test, not a clinical validation study. Age is represented as a test cohort label because the current Emergency Mode drug calculator is weight-based and does not apply age-specific dose rules. Drugs with neonatal, age, indication, renal, or route restrictions still require clinical verification.

## RLS findings

The database has RLS enabled on the core tables, which is an important baseline. However, the current policies are broad authenticated-user policies rather than least-privilege patient or unit-scoped policies.

| Area | Current behavior | PHI risk / required action |
|---|---|---|
| Patients | Any authenticated user can select, insert, and update all patient rows; only admin can delete | A compromised or misassigned authenticated account could read or alter unrelated patients. Add institution/unit and assigned-care-team scoping before production. |
| Fluid balance, drugs, investigations, notes, images, calculator results | Any authenticated user can read and insert rows for any patient; several tables lack update/delete policies | Access is not limited to the patient’s care team, and lifecycle behavior is incomplete. Add ownership/unit policies, explicit update/delete policies, and audit events. |
| Profiles | `profiles_select` uses `USING (true)` | Any client-readable profile data may expose names, designation, hospital, and unit metadata. Restrict reads to self, approved unit members, or narrowly scoped public fields. |
| Education | Public select is intentional for public education content; admin writes are protected | Confirm that no PHI is stored in education JSONB and separate public content from private clinician content. |
| Patient images | The migration comments describe a public bucket and only defines authenticated upload; no explicit object select/delete policy is shown | Public bucket access can expose radiology or clinical images. Use a private bucket, patient-scoped object paths, signed URLs, and explicit select/update/delete policies. |
| Subscriptions | Own-read and admin-read policies are present; payment-request insert allows an unauthenticated null-user path | Remove anonymous payment-request creation unless explicitly required, and validate all user and plan fields server-side. |
| Helper functions | `is_admin()` is `SECURITY DEFINER` | Retain a fixed `search_path`, add ownership review, and test privilege boundaries in a non-production database. |

These findings are documentation and review results, not a claim that the current database is safe for production PHI. The next implementation step should be a migration designed with the institution: unit membership, patient assignment, care-team roles, audited changes, private storage, and tested RLS policies. It is unsafe to replace every broad authenticated policy blindly without confirming the intended collaboration model.

## Local storage and encryption findings

There is no local-storage encryption implementation in the repository. No `crypto.subtle`, IndexedDB encryption layer, or application-managed key management was found.

The application previously used browser `localStorage` for favorites/recents, POCUS drafts, and Emergency Mode weight. Favorites and recents are non-PHI preference data. POCUS forms and weight can become patient-related or sensitive depending on user input and context, so the risky POCUS and Emergency Mode persistence was removed. Both are now held in React memory for the current session only and are cleared on reload. The UI warns users not to enter patient identifiers into the POCUS draft.

This is safer than storing plaintext PHI in `localStorage`, but it is not encryption and it is not a substitute for secure patient-bound persistence. Secure persistence requires authenticated Supabase records, RLS, audit history, encryption in transit, managed database encryption at rest, session/device controls, and institutional privacy governance. Browser-side encryption without a secure key-management model would create a false sense of protection.

## Current recommendations

Before production PHI use, make the patient image bucket private, add patient/care-team/unit-scoped RLS, add explicit update/delete policies, remove anonymous payment inserts, test `SECURITY DEFINER` functions, add audit logging, review Auth session settings, and run a threat model with the hospital’s privacy/security lead. Do not add plaintext patient drafts to browser persistence.

## Onboarding preferences (non-PHI, server-backed)

`sql/onboarding_preferences.sql` adds `public.user_preferences`, which stores
only non-clinical workspace preferences: care focus, quick-shelf tools, locale,
onboarding status (`in_progress` / `completed` / `skipped` / `needs_update`),
onboarding version, and safety-acknowledgement version. It must never hold
patient identifiers, diagnoses, weights, images, or clinical free text.

Controls implemented and verified against the hosted database:

- RLS enabled; a clinician may `SELECT`/`INSERT`/`UPDATE` **only their own row**
  (`user_id = auth.uid()`; admins may read).
- No `DELETE` policy and explicit `REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER`
  for `authenticated`, plus `REVOKE ALL` for `anon`. Hosted Supabase default
  privileges grant `ALL` to `anon`/`authenticated` on new tables, and
  **`TRUNCATE` is not protected by RLS**, so this revoke matters.
- Local storage is used only as a first-paint optimisation and never as an
  access-control decision; access remains session + RLS based.
- Boundary tests (run against the hosted project, impersonating roles/`sub`):

| Actor | Operation | Result |
|---|---|---|
| anon | SELECT | blocked (42501) |
| self | SELECT | 1 row |
| other user | SELECT | 0 rows |
| other user | UPDATE another user's row | 0 rows |
| other user | INSERT a row for another user | blocked (42501) |
| self | DELETE | blocked (42501) |
| self | TRUNCATE | blocked (42501) |

### Unresolved institution-dependent decisions

- Whether `anon` should hold any grant on new tables at all (the project-wide
  `ALTER DEFAULT PRIVILEGES ... GRANT ALL ... TO anon` is broader than least
  privilege and should be reviewed with the institution).
- Session timeout / inactivity policy, auth redirect allowlist, CSP, and
  error-monitoring service selection (P0 security items 6–7) remain to be
  reviewed and configured before production.

## RLS & least-privilege hardening (`sql/security_rls_hardening.sql`)

Applied after `sql/security_hardening.sql`. Three real vulnerabilities were
found by auditing the hosted database and are now closed:

| Finding | Severity | Fix |
|---|---|---|
| `profiles_update` used `USING (auth.uid() = id)` with no WITH CHECK, so any authenticated clinician could set `role='admin'` or change `unit_name` (**verified exploitable** via RLS impersonation) | Critical | `BEFORE UPDATE` trigger `trg_profiles_enforce_privileges` rejects non-admin changes to `role`/`unit_name`; server-side contexts (no JWT) are exempt so migrations/service_role still work |
| Hosted Supabase default privileges granted `ALL` to `anon`/`authenticated` including **`TRUNCATE`, which RLS does not protect** (`anon` held TRUNCATE on `patients`) | Critical | `REVOKE TRUNCATE, REFERENCES, TRIGGER` on all tables + `ALTER DEFAULT PRIVILEGES` so future tables inherit the restriction; `REVOKE ALL` from `anon` on all clinical/staff tables |
| `is_admin()` was `SECURITY DEFINER` with no fixed `search_path` (search_path hijacking risk) | High | Re-created with `SET search_path = public`; `set_updated_at` also pinned |
| `profiles_select USING (true)` exposed every staff profile (incl. to `anon`) | Medium | Replaced with self / same-unit / admin scope |

Retained deliberately: `anon` keeps `SELECT` on `subscription_plans` and
`INSERT` on `payments` for the hosted payment page.

### Automated boundary audit

`npm run audit:rls` (requires `DATABASE_URL`) impersonates `anon`/`authenticated`
with a JWT `sub`, mutating probes run in rolled-back transactions. Latest run
against the hosted project: **8/8 checks passed** — anon denied on patients,
monographs and profiles; cross-user preference read blocked; self role promotion
and unit change denied; TRUNCATE not granted to client roles; public plan list
still readable.

### Unresolved / institution-dependent

- `pediatric_clinician_workflow.sql` (owner-scoped patient RLS + `created_by`)
  is **not yet applied** to the hosted project — patients currently use
  unit-based RLS. Applying it changes the access model and needs clinical
  governance sign-off.
- Session timeout/redirect allowlist, CSP/headers, dependency audit + secret
  scanning, and error-monitoring service remain (P0 security items 6–7).

## Private patient-image paths (`sql/storage_path_hardening.sql`)

The private `patient-images` bucket (public = false) stores only storage paths;
signed URLs are short-lived (1 hour) and never public. The storage RLS policies
derive the patient id from the object path via
`public.patient_id_from_storage_path()` and then apply `can_access_patient()`.

The original function took *any* second path segment as the patient id, so a
wrong-prefix path (`other/<uuid>/…`) with an accessible patient id could pass.
It now requires the exact `patients/<uuid>/<file>` shape, rejects backslashes,
absolute paths, traversal (`..`), and nesting, pins `search_path`, and returns
NULL (⇒ policy denies) for anything malformed.

Client helper `src/lib/storagePaths.js` mirrors the same rules so malformed or
cross-patient paths never reach `createSignedUrl`, and file names are sanitised
(directory parts stripped, control characters and `..` removed, length capped).

Verified against the hosted database and in unit tests:

| Path | Result |
|---|---|
| `patients/<uuid>/1700000000000_x.png` | resolves to the uuid |
| `patients/../etc/passwd` | NULL (denied) |
| `patients/not-a-uuid/x.png` | NULL |
| `patients/` (missing patient) | NULL |
| `/patients/<uuid>/x.png` (absolute) | NULL |
| `other/<uuid>/x.png` (wrong prefix) | NULL |
| `patients/<uuid>/a/b.png` (nested) | NULL |
| `patients\<uuid>\x.png` (backslashes) | NULL |

`tests/storagePaths.test.mjs` covers malformed, traversal-like, cross-patient,
and missing-patient inputs. `Images.jsx` now refuses to sign a path that does
not belong to the patient being viewed, and reports upload/load failures inline
instead of via `alert()`.

## Audit + analytics PHI minimisation (`sql/audit_hardening.sql`)

`clinical_audit_events` is append-only at the RLS layer (SELECT + INSERT
policies only; no UPDATE/DELETE). The client already allowlists metadata via
`src/lib/auditValidation.js`, but the database no longer relies on the client:

- `drug_name`, `dose_unit`, `infusion_id` are length-capped (120 / 40 / 80).
- A `BEFORE INSERT` trigger rejects any `metadata` key outside
  `route, frequency, indication, reference, source, verification_stage`
  (`22023`) and the length checks raise `23514` — both verified against the
  hosted database.

**Analytics leak fixed:** `trackPageView` previously sent the raw route path, so
patient identifiers reached Firebase (e.g. `/patients/<uuid>/notes`). New
dependency-free `src/lib/analyticsPrivacy.js` strips query strings, replaces
UUIDs with `:id` and long numbers with `:n`, caps length, drops PHI-named keys
and identifier-shaped values, and keeps only primitive values. `trackPageView`
now sends the sanitised path.

Note: append-only is an RLS guarantee; `service_role`/superuser can still
delete, which is expected for a trusted backend role.
