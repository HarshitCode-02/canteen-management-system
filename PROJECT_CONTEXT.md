# Reusable Project Context for Claude

Paste this file into Claude before asking for a feature. Then fill in the **NEW FEATURE REQUEST** at the end.

## Role and rules

You are my coding mentor and pair-programmer. Work in the existing BBDU canteen app; do not rewrite it.

- Never ask me to paste or show `.env`, passwords, MongoDB URIs, JWT secrets, tokens, or other credentials. Never print or commit secret values.
- `main` now contains the multi-canteen product and is the deployed Vercel branch. Start new feature work on a separate branch from `main`; never force-push. Do not merge/push to `main` unless I explicitly ask.
- Read the actual workspace files before proposing or editing code. Do not assume unseen implementation. If one detail is unclear, ask for one specific function or give me a `grep -n` command.
- Make small, safe edits. Do not restructure/rename files, remove existing behavior, or add a dependency without asking and receiving my approval.
- Work one day/chunk at a time. Do not start the next day until I say the current one works.
- Keep explanations short and beginner-friendly. I am a B.Tech CSE student with beginner-to-intermediate MERN experience and a free account.
- Never claim a test passed unless you ran it and show the actual command/output. Say plainly when a test, device, database, or deployment was not verified.
- Preserve unrelated existing worktree changes. Never commit or push unless I explicitly approve.

## Project summary

BBDU college canteen pre-order platform: users choose a canteen, browse its menu, order ahead, choose a pickup time, collect at the counter, and pay cash/UPI at the counter. There is **no delivery, online payment, or payment gateway**.

I build this alone. The owner reports the product is deployed and working on Vercel, with a canteen handover planned. Do not claim real-device coverage, completed training, a successful pilot, or actual real-user usage unless verified.

## How to work with me / reply format

For a feature chunk, briefly use this format:
1. One sentence describing current behavior.
2. Files to change.
3. Small code edits (full file only if new/short or I ask).
4. Commands and the directory to run each from.
5. A 5–7 line test checklist.
6. **Done when**.
7. Suggested git commit message; do not commit/push until I approve.
8. Short handoff: what changed and what remains.
9. Grep/sed commands showing what I should provide for the next chunk.

Ask before a significant behavior/design choice or dependency. Do not claim completion until the change is tested appropriately and I confirm the real workflow works.

## Stack

- `client/`: React JSX, Vite, React Router, Axios, Socket.IO client, plain CSS.
- `server/`: Node.js, Express, MongoDB Atlas M0, Mongoose, JWT, bcryptjs, dotenv, CORS, Socket.IO, node-cron; CommonJS.
- Server port defaults to 5001; `CLIENT_URL` is the server's allowed frontend origin list. Set it in Vercel server environment settings, not in source. `client/vercel.json` forwards frontend-origin `/api/*` requests to the backend deployment; keep its destination aligned with the actual API host. The root `vercel.json` instead defines Vercel multi-service routing. `VITE_API_URL` overrides the same-origin path; direct cross-origin calls require verified cookie/CORS settings. Confirm the active Vercel project root before changing configs. Auth is an HttpOnly cookie; Vercel builds disable Socket.IO and use existing 30-second polling.
- Backend uses Node's built-in `node:test` (67 passing tests in the latest local run). No frontend test runner is configured.
- Helmet and express-rate-limit are installed with the user's approval; limits cover login, registration, and failed pickup-code verification.

## Folder layout

```text
client/src/  App.jsx, api.js, socket.js, sound.js, useStaffCanteen.js
  components/ Layout, Navbar, ProtectedRoute, CanteenSwitcher
  context/    AuthContext, CartContext
  pages/      Login, Register, CanteenList, CanteenMenu, Cart, MyOrders,
              Dashboard, ManageMenu, AdminPanel, BlockedStudents,
              SalesReport, AccountSettings, Discover, ReviewModeration,
              AdminAuditLogs
server/       server.js, socket.js, slots.js, noShow.js, seed.js,
              migrate-multi-canteen.js, makeAdmin.js
  models/     User, Canteen, MenuItem, Order, Counter, Review, AuditLog
  controllers/ auth, menu, order, canteen, admin, review, smart, audit
  routes/     authRoutes, menuRoutes, orderRoutes, canteenRoutes, adminRoutes,
              reviewRoutes, smartRoutes
  middleware/ auth.js, requestId.js
docs/         phone plan, staff guide, CampusBites pilot, security audit,
              go-live checklist
.github/workflows/ci.yml, docker-compose.yml, client/Dockerfile, server/Dockerfile,
vercel.json, client/vercel.json, server/index.js
```

`client/src/pages/Menu.jsx` is a legacy page, not used by the current route table.

## Client routes

- Public: `/login`, `/register`.
- Authenticated student/teacher: `/`, `/canteen/:id`, `/cart`, `/orders`, `/account` (view/edit profile and change password).
- Canteen staff/admin: `/dashboard`, `/manage-menu`, `/blocked`, `/report`.
- Admin only: `/admin`.
- Student/teacher Discover: `/discover`. Admin review moderation and audit history: `/admin/reviews`, `/admin/audit-logs`.
- The React route guard is UX; the server must enforce access independently.

## API route groups

- Auth: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `PATCH /api/auth/me` (edit own profile; password required for email change), `PATCH /api/auth/password`.
- Canteens: public `GET /api/canteens`, `GET /api/canteens/:id`, `GET /api/canteens/:id/menu`, `GET /api/canteens/:id/slots`; admin create/edit; assigned staff/admin open/close, list blocked users, and unblock after payment.
- Menu: public `GET /api/menu`; assigned staff/admin `POST`, `PATCH /:id`, `DELETE /:id`.
- Orders: logged-in create/history/cancel/late and issue own ready-order pickup QR; staff/admin list, report, status, verify by four-digit code or QR, and record payment.
- Reviews: public visible menu-item reviews; student/teacher submission requires an owned collected order containing the item; admin moderation under `/api/admin/reviews`.
- Smart tools: protected `/api/smart/meal-suggestions` and `/api/smart/assistant` use bounded deterministic logic and only the authenticated user's own order status.
- Admin: overview, create staff, assign canteens, unblock paid users, reset a user's password after verifying identity offline (`PATCH /api/admin/users/password`), and filter/paginate `/api/admin/audit-logs`.
- Health: public `GET /api/health`.
- See `README.md` and `docs/SECURITY-ROUTE-AUDIT.md` for the detailed route table/access matrix. Login/register are limited per IP; failed pickup-code checks are limited per staff account.

## Conventions and security

- JSON API; errors `{ "message": "..." }` with appropriate HTTP status.
- Auth uses a JWT in an HttpOnly cookie; unsafe browser requests must have an allowed Origin. HTTP and Socket.IO use the cookie; `protect` reloads the user each request and password changes/resets invalidate old sessions. If frontend and API are on separate Vercel domains, verify browser cookie behavior; same-origin routing/proxying is preferable.
- Roles: `student`, `teacher`, `canteen`, `admin`. Registration creates the default student role; never allow self-assigned privileged roles.
- `middleware/auth.js` exports `protect`, `authorize(...roles)`, and `canManageCanteen(user, canteenId)`. Admin can manage all; staff only assigned canteens. Check ownership on every relevant server action.
- Validate Mongo ids with `mongoose.isValidObjectId`. Never return password hashes or pickup codes to staff.
- Server recalculates order prices from MongoDB. Save order item name/price snapshots.
- Counter payment only. Never implement a payment provider/gateway or delivery.

## Models (verify code before changing)

- `Canteen`: name, slug, logo, description, location, isOpen, isActive, slotLimit, avgPrepMins, internal orderLockVersion, createdAt.
- `User`: name, email, phone, optional rollNumber/department/year/avatarUrl, hidden passwordHash/tokenVersion/orderLockVersion, role, managedCanteens, noShowCount, isBlocked, blockedAt, createdAt.
- `MenuItem`: canteen, name, price, category, image URL, isAvailable, isSpecial, prepTimeMins.
- `Order`: canteen, orderNumber, user, item snapshots, total, pickupTime, status, paymentStatus, hidden pickupCode/codeAttempts, createdAt, readyAt, lateExtended, note.
- `Order` also stores optional hashed QR token/expiry and collection/payment actor timestamps. `Review` stores eligible review text/rating; `AuditLog` stores allowlisted action metadata without credentials, pickup codes, or QR tokens.
- `Counter`: `_id` is canteen id plus IST date; `seq` creates daily order numbers.

## Business rules

- Each canteen owns its menu and orders. A cart contains items from one canteen only.
- One active order (`placed`, `preparing`, `ready`) per user.
- Server verifies item/canteen availability, open state, pickup time, slot capacity, and current DB prices.
- Order submission uses a MongoDB transaction with per-user and per-canteen write locks before checking active orders and slot capacity; order lines and merged quantities are capped. This requires replica-set-capable MongoDB; database-backed concurrency has not been tested here.
- Status flow: `placed -> preparing -> ready -> collected`. Cancel from `placed` or `preparing`; no-show only from `ready`.
- Payment is separate (`pending`/`paid`); collecting does not auto-mark paid unless staff confirms it during collection.
- A secure random 4-digit pickup code is shown only to the owner while active. Staff verify it; after five wrong attempts, further attempts return 429.
- Socket.IO events use HttpOnly-cookie-authenticated user/canteen rooms; canteen joins require ownership. Dashboard/My Orders also poll every 30 seconds.
- Pickup slots are ten minutes; the next 12 are displayed and `slotLimit` is checked server-side.
- **Current no-show rule:** long-running hosts run the job every minute; Vercel requires a trusted external scheduler to call `GET /api/internal/no-show` with `CRON_SECRET` every minute. Verify this scheduler is configured and working; Vercel Hobby Cron is only daily. Default no-show is after 20 minutes in `ready`, or 30 minutes after the one-time “running late” extension. Staff can manually mark a ready order sooner. Both use `markNoShow`; order status, strike count, and immediate block are transactional. Student owes the full no-show order total. Counter payment for every unpaid no-show order across all canteens must be recorded before unblocking; no separate fine/gateway. Do not restore the old three-strike rule.
- QR tokens are random, expire 30 minutes after ready, and only their hash is stored; collection is single-use and staff-canteen authorized. The four-digit code remains supported.
- Reviews require a collected order owned by the reviewer and containing the reviewed item; one review is allowed per user/order/item. Public ratings include only visible reviews.
- Discover suggestions and assistant responses use bounded deterministic logic; there is no paid AI or allergy/vegetarian claim. Assistant order lookup is scoped to the signed-in user.
- The production service worker caches same-origin static assets and an offline page only. It bypasses API/socket calls and does not queue orders.
- Successful order, payment, menu, canteen, account, and review moderation changes generate admin-only audit events with filtered metadata.

## Implemented / done list

- Days 1–18 are reported by me as done/tested; current code includes multi-canteen, role/ownership checks, cart, pickup codes, socket updates, slots, no-show handling, notes, history/reorder, menu search/images/tags, rush/wait.
- Days 19–21 code: sales report, admin overview/edit/block/password workflows, user password change, PWA manifest/icon.
- Account page profile editing: own name, email, phone, optional student details/avatar URL; email changes require current-password verification.
- Change password is shown on demand in Account settings; forgot-password guidance is admin-assisted (no email/SMS reset). Admin verifies identity, sets a temporary password, and shares it securely.
- Day 22: login/register per-IP rate limits, failed pickup-code throttling, Helmet, HttpOnly cookie sessions, unsafe-request Origin checks, sanitized production errors, a 100 KB JSON body cap, transactional order/no-show updates, and order quantity caps are implemented. Limits on other routes and broader validation remain **not implemented**.
- Day 23: basic responsive/touch CSS changes exist; real-phone verification is still pending.
- Phase 2 code: atomic QR pickup, verified reviews/moderation, deterministic Discover tools, static-only PWA offline shell, and admin audit log.
- Backend suite has 67 dependency-light tests; client lint/build pass locally, but the client has no automated test runner. These do not prove full DB-backed, real-device, or live deployment behavior.
- Dockerfiles and Compose support local development. GitHub Actions validates, tests, lints, builds, and builds Docker images; it does not deploy. The owner reports Vercel deployment is working; verify live environment and scheduler settings before handover.

## Remaining work plan (status is honest)

- **Phase 2 code — IMPLEMENTED / LOCAL CHECKS PASS:** verify phone, database, and live deployment behavior before production use.
- **Day 22 security hardening — IN PROGRESS:** login/register limits, failed pickup-code throttling, Helmet, and the medium-risk changes above are implemented. Broader request validation and real-environment verification remain.
- **Day 23 device review — NOT DONE:** check Discover, review, scanner, audit and staff screens at 360px on real phones.
- **Day 24 real-device test — NOT DONE:** run `docs/PHONE-TEST-PLAN.md` with student, staff, admin, and two test canteens.
- **Day 25 real menu — NOT DONE:** enter CampusBites menu only after owner confirms data. Do not run `server/seed.js` against real canteen data; it replaces menu items for its sample canteens.
- **Day 26 staff training — NOT DONE:** staff quick guide exists; train staff and confirm they can use it.
- **Day 27 pilot/feedback — NOT DONE:** pilot plan exists; run a small lunch pilot and collect feedback.
- **Days 28–29 deployment — OWNER REPORTS DEPLOYED:** verify `/api/health`, cookie login/refresh, Vercel API origin, and the trusted minute no-show scheduler from the actual deployment dashboard.
- **Day 30 handover — IN PROGRESS:** checklist exists; verify staff workflows, phone layout, Atlas backup/restore, rollback, and canteen training. Do not claim these are done without evidence.

## Known issues / limitations

- No rate limits beyond login/register and pickup verification; frontend automated tests and database-backed API integration tests are missing. The existing effect resets are narrowly documented for ESLint; keep the lint check enabled.
- MongoDB transaction concurrency behavior needs database-backed verification. Live production smoke tests, scheduler operation, phone testing, pilot, and rollback rehearsal need confirmation.
- Full dependency audits report moderate issues in development tooling (`minimatch` via client ESLint and server `nodemon`); production-only audits returned zero vulnerabilities. No forced updates were applied.
- Compose keeps Atlas external. CI does not deploy; Vercel Git integration handles deployment. Do not commit any `.env` file.

## NEW FEATURE REQUEST

- **Feature:**
- **Who uses it:**
- **What should happen:**
- **What must not change:**

## How to keep this file updated

After a feature is verified, update the matching route/model/business rule, move its plan status honestly, and add any new limitation. Do not mark a real-world test, deployment, or user rollout done until it actually happens.
