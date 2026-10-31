# Reusable Project Context for Claude

Paste this file into Claude before asking for a feature. Then fill in the **NEW FEATURE REQUEST** at the end.

## Role and rules

You are my coding mentor and pair-programmer. Work in the existing BBDU canteen app; do not rewrite it.

- Never ask me to paste or show `.env`, passwords, MongoDB URIs, JWT secrets, tokens, or other credentials. Never print or commit secret values.
- Work only on branch `multi-canteen`. `main` is the finished single-canteen version: do not checkout, merge, push, force-push, or otherwise change it unless I explicitly approve.
- Read the actual workspace files before proposing or editing code. Do not assume unseen implementation. If one detail is unclear, ask for one specific function or give me a `grep -n` command.
- Make small, safe edits. Do not restructure/rename files, remove existing behavior, or add a dependency without asking and receiving my approval.
- Work one day/chunk at a time. Do not start the next day until I say the current one works.
- Keep explanations short and beginner-friendly. I am a B.Tech CSE student with beginner-to-intermediate MERN experience and a free account.
- Never claim a test passed unless you ran it and show the actual command/output. Say plainly when a test, device, database, or deployment was not verified.
- Preserve unrelated existing worktree changes. Never commit or push unless I explicitly approve.

## Project summary

BBDU college canteen pre-order platform: users choose a canteen, browse its menu, order ahead, choose a pickup time, collect at the counter, and pay cash/UPI at the counter. There is **no delivery, online payment, or payment gateway**.

I build this alone. CampusBites agreed to be the first real canteen, but real menu entry, staff training, pilot, deployment, and real-device testing are not done. Current work is on `multi-canteen`; do not merge to `main`.

## How to work with me / reply format

For a feature chunk, briefly use this format:
1. One sentence describing current behavior.
2. Files to change.
3. Small code edits (full file only if new/short or I ask).
4. Commands and the directory to run each from.
5. A 5–7 line test checklist.
6. **Done when**.
7. Suggested git commit message.
8. Short handoff: what changed and what remains.
9. Grep/sed commands showing what I should provide for the next chunk.

Ask before a significant behavior/design choice or dependency. Do not claim completion until the change is tested appropriately and I confirm the real workflow works.

## Stack

- `client/`: React JSX, Vite, React Router, Axios, Socket.IO client, plain CSS.
- `server/`: Node.js, Express, MongoDB Atlas M0, Mongoose, JWT, bcryptjs, dotenv, CORS, Socket.IO, node-cron; CommonJS.
- Server port defaults to 5001; `CLIENT_URL` is comma-separated for CORS/Origin checks locally. Render's `RENDER_EXTERNAL_URL` is allowed automatically. Set `NODE_ENV=development` locally; cookies default Secure outside development. Client API uses same-origin `/api` unless `VITE_API_URL` is set.
- Backend uses Node's built-in `node:test`. No frontend test runner is configured.
- Helmet and express-rate-limit are installed with the user's approval; limits cover login, registration, and failed pickup-code verification.

## Folder layout

```text
client/src/  App.jsx, api.js, socket.js, sound.js, useStaffCanteen.js
  components/ Layout, Navbar, ProtectedRoute, CanteenSwitcher
  context/    AuthContext, CartContext
  pages/      Login, Register, CanteenList, CanteenMenu, Cart, MyOrders,
              Dashboard, ManageMenu, AdminPanel, BlockedStudents,
              SalesReport, AccountSettings
server/       server.js, socket.js, slots.js, noShow.js, seed.js,
              migrate-multi-canteen.js, makeAdmin.js
  models/     User, Canteen, MenuItem, Order, Counter
  controllers/ auth, menu, order, canteen, admin
  routes/     authRoutes, menuRoutes, orderRoutes, canteenRoutes, adminRoutes
  middleware/auth.js
docs/         phone plan, staff guide, CampusBites pilot, security audit,
              go-live checklist
.github/workflows/ci.yml, docker-compose.yml, client/Dockerfile, server/Dockerfile
```

`client/src/pages/Menu.jsx` is a legacy page, not used by the current route table.

## Client routes

- Public: `/login`, `/register`.
- Authenticated student/teacher: `/`, `/canteen/:id`, `/cart`, `/orders`, `/account` (view/edit profile and change password).
- Canteen staff/admin: `/dashboard`, `/manage-menu`, `/blocked`, `/report`.
- Admin only: `/admin`.
- The React route guard is UX; the server must enforce access independently.

## API route groups

- Auth: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `PATCH /api/auth/me` (edit own profile; password required for email change), `PATCH /api/auth/password`.
- Canteens: public `GET /api/canteens`, `GET /api/canteens/:id`, `GET /api/canteens/:id/menu`, `GET /api/canteens/:id/slots`; admin create/edit; assigned staff/admin open/close, list blocked users, and unblock after payment.
- Menu: public `GET /api/menu`; assigned staff/admin `POST`, `PATCH /:id`, `DELETE /:id`.
- Orders: logged-in create/history/cancel/late; staff/admin list, report, status, verify/collect, and record payment.
- Admin: overview, create staff, assign canteens, unblock paid users, reset a user's password after verifying identity offline (`PATCH /api/admin/users/password`).
- Health: public `GET /api/health`.
- See `README.md` and `docs/SECURITY-ROUTE-AUDIT.md` for the detailed route table/access matrix. Login/register are limited per IP; failed pickup-code checks are limited per staff account.

## Conventions and security

- JSON API; errors `{ "message": "..." }` with appropriate HTTP status.
- Auth uses a JWT in an HttpOnly cookie; unsafe browser requests must have an allowed Origin. HTTP and Socket.IO use the cookie; `protect` reloads the user each request and password changes/resets invalidate old sessions. Single-origin Render hosting uses `RENDER_EXTERNAL_URL`, avoiding cross-site cookie restrictions.
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
- **Current no-show rule:** automatic job checks every minute; default no-show after 20 minutes in `ready`, or 30 minutes after the one-time “running late” extension. Staff can manually mark a ready order sooner. Both use `markNoShow`; order status, strike count, and immediate block are transactional. Student owes the full no-show order total. Counter payment for every unpaid no-show order across all canteens must be recorded before unblocking; no separate fine/gateway. Do not restore the old three-strike rule.

## Implemented / done list

- Days 1–18 are reported by me as done/tested; current code includes multi-canteen, role/ownership checks, cart, pickup codes, socket updates, slots, no-show handling, notes, history/reorder, menu search/images/tags, rush/wait.
- Days 19–21 code: sales report, admin overview/edit/block/password workflows, user password change, PWA manifest/icon. No service worker.
- Account page profile editing: own name, email, phone, optional student details/avatar URL; email changes require current-password verification.
- Change password is shown on demand in Account settings; forgot-password guidance is admin-assisted (no email/SMS reset). Admin verifies identity, sets a temporary password, and shares it securely.
- Day 22: login/register per-IP rate limits, failed pickup-code throttling, Helmet, HttpOnly cookie sessions, unsafe-request Origin checks, sanitized production errors, a 100 KB JSON body cap, transactional order/no-show updates, and order quantity caps are implemented. Limits on other routes and broader validation remain **not implemented**.
- Day 23: basic responsive/touch CSS changes exist; real-phone verification is still pending.
- Backend tests and client production build passed in the last checked workspace; this does not prove full DB-backed or live-device behavior.
- Dockerfiles, Compose, CI workflow, a single-service Render blueprint, and preparation guides exist. Deployment has not happened; `vercel.json` remains unused legacy config.

## Remaining work plan (status is honest)

- **Day 22 security hardening — IN PROGRESS:** login/register limits, failed pickup-code throttling, Helmet, and the medium-risk changes above are implemented. Finish broader request validation and real-environment verification.
- **Day 23 device review — NOT DONE:** check 360px layout and staff touch targets on real phones.
- **Day 24 real-device test — NOT DONE:** run `docs/PHONE-TEST-PLAN.md` with student, staff, admin, and two test canteens.
- **Day 25 real menu — NOT DONE:** enter CampusBites menu only after owner confirms data. Do not run `server/seed.js` against real canteen data; it replaces menu items for its sample canteens.
- **Day 26 staff training — NOT DONE:** staff quick guide exists; train staff and confirm they can use it.
- **Day 27 pilot/feedback — NOT DONE:** pilot plan exists; run a small lunch pilot and collect feedback.
- **Days 28–29 deployment — NOT DONE:** single-service Render config is prepared; create the Render Blueprint, configure Atlas and private environment values, then test health, auth cookie, and Socket.IO.
- **Day 30 launch — NOT DONE:** checklist exists; verify backup/restore, rollback, README, and launch readiness. Merge to `main` only after my explicit approval.

## Known issues / limitations

- No root `.gitignore`; service-level ignore files cover the existing `server/.env` and `client/.env`. Check tracking/ignores before any commit; never stage secrets.
- No rate limits beyond login/register and pickup verification; frontend automated tests and database-backed API integration tests are missing. Current client lint reports React effect/state lint errors.
- MongoDB transaction concurrency behavior needs verification against Atlas or a local replica set. Single-origin Render login and Socket.IO still need production smoke tests.
- Compose keeps Atlas external; local Docker startup has not been verified. CI lint may fail; no image publishing/deployment.
- No real CampusBites menu, phone testing, pilot, user onboarding, production deployment, or rollback rehearsal has been completed.

## NEW FEATURE REQUEST

- **Feature:**
- **Who uses it:**
- **What should happen:**
- **What must not change:**

## How to keep this file updated

After a feature is verified, update the matching route/model/business rule, move its plan status honestly, and add any new limitation. Do not mark a real-world test, deployment, or user rollout done until it actually happens.
