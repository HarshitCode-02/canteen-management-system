# CampusBites system audit

**Audit date:** 2026-10-31  
**Scope:** Repository source, tracked configuration, routes, models, existing tests, and current local changes. This is not a production penetration test or a live deployment test.

## Confirmed architecture

- React 19 + Vite client in `client/`; Express 5 + Node backend in `server/`; MongoDB through Mongoose.
- Vercel services/rewrite configuration routes `/api/*` to the server and other paths to the client. A separate Render configuration also exists; confirm which deployment is authoritative before changing either.
- Browser API calls use same-origin `/api` by default, with an optional `VITE_API_URL` development override.
- Authentication uses an HttpOnly cookie; the client does not rely on a bearer token in local storage.
- Orders are created in a MongoDB transaction. The transaction preserves active-order, canteen-open, slot-capacity, counter and audit-log protections.
- The client has a static-only service worker. It does not queue orders or cache authenticated API responses.

## Existing capabilities verified in source

Multi-canteen menus and staff assignment; student/teacher ordering; staff order and payment actions; QR and fallback-code pickup; order history and reorder; verified reviews; deterministic Discover tools; admin audit log; reports; no-show handling; Docker development files; and GitHub Actions CI.

## Confirmed issues and risks

| Severity | Finding | Evidence/status |
|---|---|---|
| Medium, fixed locally | Socket.IO authenticated cookie sessions but did not check handshake Origin. | Fixed by checking the exact configured or request same-origin value before JWT processing. Focused regression tests pass. Production deployment is not verified. |
| High operational risk | The reported ~30-second checkout delay cannot be attributed from repository inspection alone. | DB connection wait and order transaction stage timings are now logged with a request ID. No production timing data was available. |
| Medium | A network timeout could leave the student unsure whether an order was committed. | Checkout now sends a stable idempotency key and retries return the saved order for the same payload. Confirm the new MongoDB partial unique index exists in the deployed database. |
| Medium | On Vercel, the client intentionally does not open Socket.IO; order status depended on polling while on My Orders. | Added global in-app status refresh/notifications, polling every 30 seconds, and refresh-on-focus/visibility/reconnect. This is not push delivery when the site is closed. |
| Medium | Mobile layout has not been visually tested at the requested widths. | Added responsive navbar/cart rules; browser preview could not start because local port binding returned `EPERM`. |
| Low | Password minimum is six characters. | Verified in `server/controllers/authController.js`; consider a longer minimum and a user-friendly password-strength policy. |
| Low | Order history returns at most 50 orders and has no status/date/canteen search or server pagination. | `GET /api/orders/my` uses a fixed limit. Add filters/pagination before history grows materially. |
| Low | Stock control is a simple availability toggle, not quantity inventory. | `MenuItem` has `isAvailable` but no stock quantity. This matches a simple canteen workflow; do not add stock accounting without an operational need. |

## Validation and limitations

- Production dependency audits: 0 reported vulnerabilities for both `server` and `client` with `--omit=dev`.
- The full backend dependency audit reports two moderate `minimatch` advisories through `nodemon` (development dependency); do not use `npm audit fix --force` because npm proposes a breaking nodemon version change.
- The full client audit reports six moderate `minimatch` advisories through ESLint tooling; no compatible non-forced fix was reported.
- Frontend lint and production build pass.
- Focused backend regressions pass. The full backend test run could not complete because tests opening HTTP listeners received `listen EPERM` in this environment.
- No live Vercel/Render/Atlas configuration, production telemetry, real-device browser, or disposable production-like database was available.
- Tracked environment-file inspection found only `.env.example` templates. The targeted source pattern scan was not a complete scan of Git history.
- The production build emitted JavaScript chunks of approximately 454 KB and 477 KB before gzip; the transfer impact on mobile was not visually/network profiled.
- Do not infer a 1–3 second checkout response from mocked controller tests or local build output.

## Recommended next work

1. Deploy the security and idempotency changes to a staging environment; verify the Socket.IO origin behavior and build the idempotency index safely.
2. Capture checkout timing logs under normal pilot traffic and compare database wait, transaction stages, and platform latency before tuning queries.
3. Perform manual responsive/keyboard checks at 320, 360, 375, 390, 414, and 430px, plus tablet/desktop.
4. Add order-history filters/pagination and client component tests once a frontend test framework is approved.
5. Keep push notifications, exact inventory, and advanced analytics as separate, measured phases.
