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
