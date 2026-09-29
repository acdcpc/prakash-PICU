# Open decisions — yes/no sign-off

Every item below already has a safe default **implemented and verified**, so the
app is fully functional as-is. Each row states what changes if the answer is
"no", so the decision can be made in one pass.

Status: **ready for institutional security and clinical governance review.**

| # | Decision | Current default (if YES) | If NO, what changes |
|---|---|---|---|
| 1 | Auth redirect allowlist | `VITE_ALLOWED_AUTH_ORIGINS` unset → after login the app returns to the origin it is served from. Works locally and on any deploy. | Set `VITE_ALLOWED_AUTH_ORIGINS=https://<your-domain>` in the deployment environment (and `.env` for local). The allowlist then becomes authoritative and a copy of the app on another origin cannot redirect to itself. |
| 2 | Error monitoring | `src/lib/errorMonitoring.js` exists but transmits nothing (no DSN). Reports are still scrubbed and allowlisted if used. | Provide the service DSN → set `VITE_ERROR_MONITORING_DSN`. Choose a regime that accepts our PHI-excluded payload shape. |
| 3 | Content-Security-Policy | `public/_headers` ships a strict CSP limited to self + Supabase + Google Fonts + Firebase. | Remove or loosen the CSP header. Recommended instead: deploy once, and if something is blocked, narrow the specific directive rather than dropping the policy. |
| 4 | Dependency audit in CI | Runs advisory (`npm audit --audit-level=high`, `continue-on-error`). Findings are build-time only: Capacitor CLI toolchain (`@xmldom/xmldom`, `uuid`, `xcode`) — none ship in the app bundle. | Make it blocking by removing `continue-on-error` from `.github/workflows/ci.yml`, after agreeing a threshold (e.g. fail on high and above). |
| 5 | Inactivity auto sign-out | 30 minutes (`SESSION_IDLE_TIMEOUT_MS` in `src/lib/session.js`), then the clinician is signed out with an explanatory message. | Change the constant. Consider a shorter window for shared ward devices; the message text uses `IDLE_MINUTES` derived from the same constant. |

## How to answer

Reply with e.g. `1 yes, 2 yes, 3 yes, 4 no, 5 no — use 15 min`. Items answered
"yes" require no work; each "no" is a small, tested change.

## Already decided and applied

- Owner-scoped patient RLS (`created_by` / `can_access_patient()`) — applied and
  verified by the boundary audit (11/11).
- Payment model — no webhooks; anonymous submission → admin review →
  one-time activation code → in-app redemption. Entitlement is granted only by
  the server-side `redeem_activation_code` RPC.
