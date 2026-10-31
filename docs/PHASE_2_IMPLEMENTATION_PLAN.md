# CampusBites Phase 2 Implementation Plan

## Baseline and repository state

- Work starts on `feature/campusbites-phase-2`, based on `origin/main` at `5f7cf92` (the latest fetched commit when this phase began).
- The worktree was clean before the branch was created. No history was rewritten and no existing branch was changed.
- Tracked environment files are examples only (`client/.env.example`, `server/.env.example`). Local `.env` files were not opened, printed, or staged.
- Baseline checks on the feature branch:
  - `npm --prefix server test`: 45 passed, 0 failed.
  - `npm --prefix client run lint`: passed.
  - `npm --prefix client run build`: passed.

## Existing architecture verified

- `client/` is React with Vite, React Router, Axios, Socket.IO client, and plain CSS. Routes and role gates are in `client/src/App.jsx`; auth restoration uses the HttpOnly cookie through `/api/auth/me` in `client/src/context/AuthContext.jsx`.
- `server/` is CommonJS Node.js/Express with Mongoose and MongoDB, bcryptjs, JWT, cookie auth, CORS/origin checks, Helmet, express-rate-limit, Socket.IO, and node-cron.
- Models are in `server/models/`: User, Canteen, MenuItem, Order, and Counter. The existing Order includes order-line snapshots, status, payment status, a hidden four-digit pickup code, and code-attempt count.
- Routes are grouped in `server/routes/` for auth, canteens, menu, orders, and admin. Order routes require authentication; staff/admin routes additionally require the correct role, and controller paths check canteen ownership.
- Order creation recalculates prices from MongoDB, rejects unavailable/cross-canteen items, and uses a MongoDB transaction with per-user/canteen write locks for active-order and pickup-slot rules.
- The frontend and API are routed through Vercel configuration. `client/vercel.json` proxies `/api/*` to the backend project; root `vercel.json` configures Vercel multi-service routing. Vercel disables the persistent Socket.IO client and uses 30-second polling.
- The project has a PWA manifest and SVG icon, but no service worker or offline fallback. It has no client automated-test script. Backend tests use `node:test` and currently number 45.

## Verified gaps and risks

1. `server/controllers/orderController.js` currently reads a ready order, validates a pickup code, then saves `collected` separately. Concurrent correct verification requests can both pass the initial read. Collection must become an atomic ready-to-collected transition; payment must remain a separate explicit choice.
2. Cancellation and ordinary status updates also use read-then-save transitions. These should use status-qualified atomic updates where compatible with current behavior.
3. There is no QR pickup token, item review, budget recommendation, canteen comparison UI, deterministic assistant, admin audit-log model/UI, or service worker.
4. The current pickup code is hidden by default in queries and is returned only through the customer's own order-history route while active. Staff responses strip the code.
5. `client/src/api.js` still describes direct separate-domain API configuration as the production default, while the latest client Vercel config uses a same-origin API proxy. Keep code comments and handover docs consistent with the deployed routing.
6. Mobile CSS has small-screen rules and 44px targets for some order/dashboard actions, but there is no automated viewport coverage and no verified physical iOS/Android test.
7. Baseline tests do not start a disposable MongoDB or run browser journeys. They must not be pointed at production data.

## Implementation sequence

1. Harden existing order transitions and add regression tests for concurrent/duplicate collection without changing payment semantics.
2. Add QR pickup using a cryptographically random opaque token, store only a hash, expose it only to the authenticated order owner, validate it on the server, enforce staff canteen assignment, and atomically collect. Keep the four-digit code as fallback.
3. Add review schema and unique eligibility constraint, server-side eligibility checks, safe text handling, rating aggregation, and admin moderation.
4. Add deterministic budget suggestions using integer paise and bounded result generation. Reuse trusted public menu/canteen data for comparison. Add an allowlisted, deterministic assistant that only reads approved public menu data and the authenticated user's own orders.
5. Add a versioned static-asset service worker and offline status/fallback without caching authenticated API responses. Review responsive screens and document device-only checks.
6. Add server-derived audit events for consequential mutations and an admin-only paginated/filterable endpoint and view. Avoid logging credentials, cookies, QR tokens, or pickup codes.
7. Add focused frontend tests using a minimal compatible test stack if feasible; expand backend tests; run all baseline commands, builds, and safe diff/config checks.
8. Update README, test report, and deployment documentation. Prepare a reviewed feature-branch commit; do not merge to `main`.

## Dependency and schema decisions

- Do not add a paid API or make a paid service a runtime requirement.
- The backend already has `node:test`; keep using it for backend unit and controller tests. A small browser-compatible QR generation/scanning library and a minimal frontend test runner may be added only after checking current Node/Vite compatibility and their bundle impact.
- Expected backward-compatible model additions: QR token hash/expiry and collection/payment actor timestamps; a review collection with a unique order-item/student constraint; and append-only audit events. Do not drop collections or rewrite existing orders.
- Any required index creation must be additive and documented. Existing records without new optional fields must continue to work.

## Security and deployment constraints

- Preserve HttpOnly cookie authentication, origin checks, existing role checks, canteen ownership checks, rate limits, and production error handling.
- Derive all actor/user IDs from `req.user`; never trust frontend role, owner, or canteen claims.
- QR contents must not be an order ID alone and must not contain a session secret. Only a token hash is stored; collection is single-use and status-qualified atomically.
- Public comparison/assistant data is limited to active canteens and available menu items. Assistant order lookup is restricted to the authenticated user's records.
- Never cache authenticated API responses in the service worker. Offline mode must not pretend an order was submitted.
- Vercel functions cannot rely on in-process cron or persistent WebSockets. The existing external no-show scheduler remains a handover verification item.

## Completion status

| Phase | Status |
|---|---|
| Order transition hardening | Implemented; unit/controller tests cover concurrent collection and payment separation |
| QR pickup | Implemented with owner-only issuance, hashed expiring tokens, assigned-staff authorization, single-use collection, and four-digit fallback |
| Reviews | Implemented with collected-order eligibility, duplicate protection, visible-only ratings, and admin moderation |
| Discover tools | Implemented with bounded deterministic suggestions, canteen comparison, and authenticated own-order assistant queries |
| PWA offline shell | Implemented for static assets and an offline page; API, Socket.IO, and order submission are never cached/queued |
| Audit log | Implemented for order, payment, menu, canteen, account, and review moderation changes, with admin-only filtering/pagination |
| Automated verification | Backend suite, client lint, and client production build pass locally; no client test runner is configured |

This table reports source changes and the local checks recorded in `PHASE_2_TEST_REPORT.md`, not live service behavior. Live Vercel settings, an isolated database/replica-set integration run, and physical-device behavior remain unverified.
