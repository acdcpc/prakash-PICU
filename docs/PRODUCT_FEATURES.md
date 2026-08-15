# prakash-PICU expanded product features

## New repository

The application is maintained in the private repository `acdcpc/prakash-PICU`. The original repository remains untouched by this expansion.

## Supabase setup

Run `sql/migration.sql` first, followed by `sql/subscriptions.sql`. The second migration creates subscription plans, user subscriptions, payment requests, RLS policies, and the admin-only activation RPC. The client deliberately does not collect card numbers or passwords.

A production payment provider still requires a server-side adapter with signed webhook verification, idempotency, reconciliation, refund handling, and merchant credentials. The UI supports manual review and provider selection for eSewa, Khalti, and Stripe without pretending that a charge has succeeded.

## Firebase Analytics

Set the `VITE_FIREBASE_*` values in a local `.env` only after creating a Firebase Web app. When unset, analytics is disabled. Events are limited to anonymous page views and product actions. The adapter filters keys that could contain patient identifiers, diagnosis, contact information, or direct identifiers. Analytics consent and local privacy policy review should be completed before production release.

## Kapoori-ka parity

`Child Health` provides milestones, Nepal immunization schedule, growth-chart access, M-CHAT prompts, and a disease-library workspace. The source datasets are stored under `src/data/` and should be reviewed whenever Nepal’s official schedule or the source application changes.

## Drug-reference ingestion

The repository contains `scripts/ingest-teddy-bear.mjs`. Run it with a licensed local copy:

```bash
npm run ingest:drugs -- /path/to/licensed/Teddybear.pdf .clinical-private/drug-reference
```

The script extracts a private monograph index and source offsets. The output directory is gitignored so the full copyrighted text is not redistributed. The committed application contains a curated starter dataset and source links rather than the 945-page monograph text.

## Disease library

The disease library is structured as source-linked topic metadata. It includes asthma, seizures, refractory status epilepticus, pediatric ARDS, septic shock, shock, pneumonia, diarrhea, DKA, anaphylaxis, bronchiolitis, and meningitis, with links to AAP, IAP, NEPAS, NICE, AHA, SCCM, WHO, ISPAD, and other authoritative sources. Topic content must be reviewed and versioned by a pediatric clinical governance group before being used as a protocol.

## POCUS workflow

The Clinical Tools POCUS workspace includes study selection, indication, views/protocol, findings, limitations/quality, supervisor, and follow-up fields. Drafts are stored locally without patient identifiers. Production deployment should connect the workflow to Supabase patient records and governed image storage, with audit history, consent, access controls, retention policies, and DICOM/PACS requirements resolved first.

## Safety boundary

These features are clinical decision-support scaffolds. They do not replace bedside examination, licensed drug references, local protocols, prescribing review, specialist consultation, or emergency services. Every medication dose, algorithm, score interpretation, and immunization recommendation must be verified against the current licensed reference and institutional policy.
