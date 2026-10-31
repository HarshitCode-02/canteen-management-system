# CampusBites security audit

**Audit date:** 2026-10-31  
**Method:** Read-only source review followed by a focused test of the fix. Deployment settings and a live penetration test were not available.

## Verified finding

| Severity | Affected code | Evidence and impact | Remediation | Verification |
|---|---|---|---|---|
| MEDIUM | `server/socket.js`; `server/allowedOrigins.js` | Socket.IO verified the HttpOnly-cookie JWT but did not validate the handshake `Origin`. Cross-site browser socket connections could use a victim's cookie and join their private user room. | Reject absent or unapproved origins before JWT verification; accept only the configured allowlist or exact same-origin host/protocol. | Fixed locally. `server/test/allowed-origins.test.js` covers configured, same-origin, missing, attacker, and invalid-forwarded-protocol cases. Production deployment is not verified. |

## Controls confirmed in source

- Tracked environment-file inspection found only `.env.example` templates, not a real `.env`; a targeted assignment-pattern scan reported only template/test lines. This is not a full Git-history secret scan.
- JWT signing and verification use HS256; tokens expire after seven days; server startup requires `JWT_SECRET`.
- Authentication reads the HttpOnly auth cookie. Password changes increment the token version and revoke old sessions.
- Cookies are Secure outside development; unsafe HTTP methods require an allowed Origin.
- Registration assigns the student role rather than accepting a client-supplied role. Login/register and pickup verification have rate limits.
- Staff canteen ownership is checked in routes/controllers; order reads and mutations are owner-scoped where appropriate.
- Order status transitions are allowlisted; collection uses code/QR checks; QR tokens are random, hashed at rest, expiring, and consumed conditionally.
- Audit event details are allowlisted. General error logs contain request metadata and error type, not request bodies, passwords, tokens, or pickup codes.
- Cart state is local-only; the application does not persist authentication tokens in local storage.

## Risks and unverified deployment controls

- Password minimum length is six characters. Recommend increasing it and checking password-reset/admin provisioning policies.
- `SameSite=None` in production requires correct HTTPS and origin configuration; validate real Vercel/Render domains and cookie behavior.
- Atlas least-privilege roles, network allowlist, backups/restore, TLS, and secret rotation are external settings and were not verifiable.
- Production dependency audits returned 0 vulnerabilities with `npm audit --omit=dev`.
- Full backend audit reports two moderate `minimatch` advisories through development dependency `nodemon`. The suggested `npm audit fix --force` would install a breaking nodemon version; no dependency was changed.
- Full client audit reports six moderate `minimatch` advisories through ESLint tooling and says no fix is available; no dependency was changed.
- Transaction/index behavior, including the new idempotency unique partial index, must be verified against a disposable replica-set database and then confirmed in deployment.
- The socket-origin fix is not verified against a live deployment or malicious-origin browser test.

## Verification commands

- Focused security/order regression set — 30 passed, 0 failed (origin, checkout/idempotency, order validation, collection, QR, no-show, slots, and error handling).
- `npm --prefix server audit --omit=dev` — 0 vulnerabilities.
- `npm --prefix client audit --omit=dev` — 0 vulnerabilities.
- Full backend test suite was attempted; listener-dependent tests could not bind a port (`EPERM`) in this environment.
