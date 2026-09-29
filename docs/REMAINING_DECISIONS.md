# Open decisions — yes/no sign-off

Every item below already has a safe default **implemented and verified**, so the
app is fully functional as-is. Each row states what changes if the answer is
"no", so the decision can be made in one pass.

Status: **decided 2026-09-29** — see "Answers and what was done" at the bottom.

| # | Decision | Current default (if YES) | If NO, what changes |
|---|---|---|---|
| 1 | Auth redirect allowlist | `VITE_ALLOWED_AUTH_ORIGINS` unset → after login the app returns to the origin it is served from. Works locally and on any deploy. | Set `VITE_ALLOWED_AUTH_ORIGINS=https://<your-domain>` in the deployment environment (and `.env` for local). The allowlist then becomes authoritative and a copy of the app on another origin cannot redirect to itself. |
| 2 | Error monitoring | `src/lib/errorMonitoring.js` exists but transmits nothing (no DSN). Reports are still scrubbed and allowlisted if used. | Provide the service DSN → set `VITE_ERROR_MONITORING_DSN`. Choose a regime that accepts our PHI-excluded payload shape. |
| 3 | Content-Security-Policy | `public/_headers` ships a strict CSP limited to self + Supabase + Google Fonts + Firebase. | Remove or loosen the CSP header. Recommended instead: deploy once, and if something is blocked, narrow the specific directive rather than dropping the policy. |
| 4 | Dependency audit in CI | Runs advisory (`npm audit --audit-level=high`, `continue-on-error`). Findings are build-time only: Capacitor CLI toolchain (`@xmldom/xmldom`, `uuid`, `xcode`) — none ship in the app bundle. | Make it blocking by removing `continue-on-error` from `.github/workflows/ci.yml`, after agreeing a threshold (e.g. fail on high and above). |
| 5 | Inactivity auto sign-out | 30 minutes (`SESSION_IDLE_TIMEOUT_MS` in `src/lib/session.js`), then the clinician is signed out with an explanatory message. | Change the constant. Consider a shorter window for shared ward devices; the message text uses `IDLE_MINUTES` derived from the same constant. |

## Answers and what was done

| # | Answer | Outcome |
|---|---|---|
| 1 | No — lock the allowlist | Done, without needing a domain: `vite.config.js` now resolves the deployment's canonical origin at build time (Netlify's `URL` / `DEPLOY_PRIME_URL`, or `VITE_SITE_ORIGIN` for other hosts) and injects it, so a production build only accepts auth redirects on its own domain. An explicit `VITE_ALLOWED_AUTH_ORIGINS` still wins when set; local development keeps working. |
| 2 | No — wire monitoring | Done, service-agnostic: `src/lib/errorMonitoring.js` now accepts a **Sentry-compatible DSN** (`VITE_ERROR_MONITORING_DSN`) or any HTTPS JSON endpoint (`VITE_ERROR_MONITORING_ENDPOINT`). Paste one value at deploy time and it is live; both stay off when unset. **Wiring added since:** global `error`/`unhandledrejection` handlers, a top-level error boundary whose fallback never renders error text, and `npm run check:phi` — which fails the build if any future call site passes more than the allowlisted context keys or interpolates patient values into an error message. Payloads remain PHI-excluded (no user, request, breadcrumbs, or stack). |
| 3 | Yes — keep the CSP | Unchanged; `public/_headers` keeps the strict policy. If a live deploy blocks a needed resource, narrow that one directive rather than removing the policy. |
| 4 | Unclear — explained and resolved | The question was whether an automated dependency check should be allowed to fail the build. It is now moot: `npm audit fix` removed the one **high**-severity finding, and CI now **fails the build on any high or critical** vulnerability. The 3 remaining moderate findings live only in the Capacitor CLI build toolchain (never shipped to users) and do not block. |
| 5 | Yes — 30 minutes | Unchanged; the idle sign-out stays at 30 minutes. |

## Already decided and applied

- Owner-scoped patient RLS (`created_by` / `can_access_patient()`) — applied and
  verified by the boundary audit (11/11).
- Payment model — no webhooks; anonymous submission → admin review →
  one-time activation code → in-app redemption. Entitlement is granted only by
  the server-side `redeem_activation_code` RPC.
