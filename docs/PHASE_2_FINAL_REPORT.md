# CampusBites Phase 2 final report

## Summary

Phase 2 extends the existing canteen pre-order app without replacing its MERN architecture or removing the four-digit pickup flow. It adds QR pickup, verified reviews, student/teacher Discover tools, a static-only offline shell, and an admin audit log, alongside UI and order-flow integration.

The implementation was developed on `feature/campusbites-phase-2`, based on `origin/main` at `5f7cf92`. The report records code behavior and local checks; it does not claim that a real canteen pilot, live deployment validation, or physical-device test occurred.

## Features delivered and how they work

### 1. Safer order collection and QR pickup

- Existing four-digit pickup codes remain available; failed-code rate limiting and payment-at-counter behavior are preserved.
- A customer can display a QR for a ready order. The server issues a cryptographically random token, returns it to that order's authenticated owner, and stores only a SHA-256 hash with an expiry.
- A staff/admin scan is checked against the order's canteen assignment and ready status. The status-qualified database update consumes the QR token and records who collected the order, so only one simultaneous valid scan can collect it.
- The QR scanner requests camera access only after the staff member starts it. HTTPS is required; staff can use the existing four-digit code as fallback.
- Collection does not automatically mean payment. Staff can record payment during collection or later, after receiving cash/UPI.
- Order status changes, collection and cancellation use conditional updates to avoid stale read-then-write transitions.

### 2. Verified item reviews

- Only a signed-in student/teacher can review an item included in their own collected order.
- Ratings are integers from 1 to 5; review text is optional and limited to 500 characters.
- A compound unique index allows one review per user/order/item. Public menu ratings aggregate visible reviews only.
- Administrators have a protected moderation page to hide or restore reviews. Hidden reviews no longer contribute to public ratings.

### 3. Discover: budget suggestions, comparison, and assistant

- **Budget suggestions** use current available items at active, open canteens, use integer paise for calculations, and cap budget, menu size, number of items, and result count.
- **Canteen comparison** supports up to three canteens and compares only exact normalized item-name/category matches; it shows availability separately.
- **Canteen assistant** is deterministic and does not call an external or paid AI service. It can search menu/canteen information, suggest budget combinations, show popular items, and check only the authenticated user's active order.
- The assistant does not infer a user's identity from message text or claim nutrition/allergen safety; the project does not maintain allergen data.

### 4. Static-only PWA offline shell

- Production registers a service worker and the manifest includes an application scope.
- The service worker caches an offline page and same-origin static files; it bypasses API and Socket.IO requests.
- It does not cache account/order data or queue an order to submit later. Offline mode is informational, not an ordering mode.
- Camera, install, and offline behavior still require verification on target Android/iOS devices.

### 5. Admin audit history

- Successful order, payment, menu, canteen, staff-account creation/assignment, no-show blocking/unblocking, admin password reset, and review-moderation actions write server-side audit records.
- Actor and role come from the authenticated request; a request ID is attached for correlation.
- Audit details are allowlisted and avoid passwords, cookies, raw QR tokens, pickup codes, and free-form review text.
- Administrators can filter by event type/canteen and page through records. Audit history is not a substitute for accounting/payment records.

### 6. Documentation and handover

- Added a public-facing role tutorial at `docs/WEBSITE_TUTORIAL.md`.
- Updated the root README, interview guide, project context/handover, client README, and security route audit.
- Added Phase 2 implementation, test, and deployment reports/checklists.

## Main implementation areas

| Area | Files |
|---|---|
| QR and order lifecycle | `server/controllers/orderController.js`, `server/models/Order.js`, `server/routes/orderRoutes.js`, `server/noShow.js`, `client/src/components/PickupScanner.jsx`, `client/src/pages/MyOrders.jsx`, `client/src/pages/Dashboard.jsx` |
| Reviews | `server/models/Review.js`, `server/controllers/reviewController.js`, `server/routes/reviewRoutes.js`, `client/src/components/ReviewForm.jsx`, `client/src/components/MenuItemReviews.jsx`, `client/src/pages/ReviewModeration.jsx` |
| Discover tools | `server/controllers/smartController.js`, `server/services/mealSuggestions.js`, `server/routes/smartRoutes.js`, `client/src/pages/Discover.jsx`, Discover components |
| Offline shell | `client/public/sw.js`, `client/public/offline.html`, `client/public/manifest.webmanifest`, `client/src/main.jsx` |
| Audit log | `server/models/AuditLog.js`, `server/services/auditLog.js`, `server/controllers/auditController.js`, `server/middleware/requestId.js`, `server/routes/adminRoutes.js`, `client/src/pages/AdminAuditLogs.jsx` |
| Documentation | `README.md`, `INTERVIEW.md`, `PROJECT_CONTEXT.md`, `project.md`, `docs/PHASE_2_*`, `docs/SECURITY-ROUTE-AUDIT.md`, `docs/WEBSITE_TUTORIAL.md` |

## Verification run locally

Run these from the repository root.

| Command | Result |
|---|---|
| `npm --prefix server test` | 67 passed, 0 failed |
| `npm --prefix client run lint` | Passed |
| `npm --prefix client run build` | Passed; QR scanner code is lazy-loaded into a separate chunk |
| `find server -type d -name node_modules -prune -o -type f -name '*.js' -print0 \| xargs -0 -r -n1 node --check` | Passed |
| `git diff --check` | Passed |
| `npm audit --prefix client --omit=dev` | 0 production vulnerabilities |
| `npm audit --prefix server --omit=dev` | 0 production vulnerabilities |

Full development dependency audits reported 6 moderate advisories in the client dependency tree and 2 moderate advisories in server development tooling (`minimatch` via ESLint/nodemon). No automatic or forced dependency update was applied.

Backend tests are unit/controller tests with stubs; they do not connect to MongoDB. There is no frontend test runner. The local Docker Compose build was not verified because Docker Desktop's daemon was unavailable.

## Production and handover checks still needed

Before relying on the added features with real users:

1. Verify the production Vercel project/root, environment variable names, client/API routing, and same-origin cookie login.
2. Apply/check additive MongoDB indexes on a backed-up or disposable database first. Check for duplicate review data before enabling the review unique index.
3. Run database-backed order/QR concurrency tests with a replica-set-capable test database, never production customer data.
4. Test QR camera permission/scan and manual code fallback on the supported HTTPS Android/iOS devices.
5. Test install/offline messaging on actual devices; confirm orders are not presented as submitted while offline.
6. Confirm the trusted external no-show scheduler is configured and working on Vercel.
7. Verify Atlas least-privilege access, backups, restore procedure, and deployment rollback.
8. Run the staff tutorial with the actual canteen owner and verify their assigned canteen and current menu.

The owner reports Vercel deployment. This workspace has not independently confirmed the resulting production deployment or whether a Git push triggers it.
