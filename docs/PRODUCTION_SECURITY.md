# Production security checklist

> Status: **ready for institutional security and clinical governance review.**
> Not production-ready for PHI until the institution-dependent items below are
> approved and the approved Supabase environment, access model, privacy review,
> clinical editorial process, and deployment controls are verified.

## Implemented controls

### Access & least privilege
- RLS enabled on every clinical table; `anon` holds no grant on clinical or
  staff data (only `subscription_plans` SELECT and `payments` INSERT).
- `TRUNCATE`/`REFERENCES`/`TRIGGER` revoked from `anon`/`authenticated` (they are
  **not** protected by RLS) and removed from default privileges for new tables.
- Profile privilege escalation blocked by a `BEFORE UPDATE` trigger: a clinician
  cannot change their own `role` or `unit_name`.
- `SECURITY DEFINER` functions pin `search_path`.
- `profiles` is no longer world-readable; scope is self / same unit / admin.
- Live boundary audit: `npm run audit:rls` (8/8 passing).

### Data minimisation
- Onboarding/preferences store only non-PHI values (server-backed, versioned).
- Private `patient-images` bucket (public = false); short-lived signed URLs only.
- Strict `patients/<uuid>/<file>` path parsing; traversal/absolute/nested/wrong
  prefix rejected server-side and client-side.
- Audit events are append-only at the RLS layer; metadata keys are allowlisted
  in the database and free-text fields are length-capped.
- Analytics strips query strings and identifiers (`/patients/<uuid>/notes` →
  `/patients/:id`); PHI-named params are dropped.

### Session & auth
- Auth redirects are restricted to `VITE_ALLOWED_AUTH_ORIGINS` (authoritative
  when set; unset falls back to the running origin for local/preview).
- Inactivity auto sign-out after 30 minutes (`SESSION_IDLE_TIMEOUT_MS`).
- Explicit sign-out clears the cached non-PHI preferences and auth error.
- Auth errors are sanitised — tokens/URLs are never surfaced or logged.

### Headers & scanning
- `public/_headers` (Netlify format): strict CSP, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
  `Permissions-Policy`, HSTS, `Cross-Origin-Opener-Policy`.
- `npm run scan:secrets` — committed-secret scan (JWT-aware: public `anon` keys
  are informational, `service_role`/private keys fail).
- `npm run audit:deps` — `npm audit --audit-level=high`.

## Institution-dependent (not yet approved)

| Item | Needs |
|---|---|
| CSP contents | Validate the deployed CSP against the real origins (analytics, monitoring); tighten to the institution's policy |
| Auth redirect allowlist | Set `VITE_ALLOWED_AUTH_ORIGINS` to the production origins |
| Session timeout value | Confirm 30 minutes is clinically appropriate for shared devices |
| `pediatric_clinician_workflow.sql` | Owner-scoped patient RLS is **not applied**; patients currently use unit-based RLS. Changing the access model needs governance sign-off |
| Dependency + secret scanning | Run in CI with an agreed cadence and severity threshold |
| Error monitoring | Choose a service with PHI-excluding configuration and a documented policy |
| Payments | Verify webhooks server-side before changing entitlements; never trust client plan/price/role |
| Session/device visibility | Confirm whether device/session listing is required |
| HTTPS-only | Enforce at the host/CDN and verify the redirect |

## Commands

```bash
npm test              # unit tests (54+)
npm run build         # production build
npm run lint          # static analysis
npm run audit:rls     # live RLS boundary audit (needs DATABASE_URL)
npm run scan:secrets  # committed-secret scan
npm run audit:deps    # dependency audit
```
