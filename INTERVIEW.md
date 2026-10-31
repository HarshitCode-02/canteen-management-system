# Interview Guide

Use this as a practice guide, not a script to memorize. The owner reports deployment on Vercel; distinguish that from checks not independently verified here.

## 30-second pitch

I built a MERN pre-order platform for college canteens. Students and teachers choose a canteen, browse its menu, select a pickup slot, and collect their order at the counter. There is no delivery or online payment. Phase 2 adds single-use QR pickup, verified reviews, budget-based suggestions, canteen comparison, a deterministic assistant, and admin audit history. I use HttpOnly-cookie JWT authentication, per-canteen ownership checks, server-side price calculation, MongoDB, and polling with Socket.IO support outside Vercel. The owner reports the app is deployed on Vercel; real-device testing and a canteen pilot should only be claimed after they are completed.

## Two-minute walkthrough

1. A student signs in and chooses one active canteen.
2. The menu shows categories, search, images, popular items, specials, rush, and an estimated wait.
3. The cart holds one canteen's items. The student chooses one of the available pickup slots and can add a short note.
4. The API checks the user, canteen status, item availability, active-order rule, and slot capacity. It looks up prices from MongoDB, saves item snapshots, increments a per-canteen/day counter, and creates a pickup code.
5. The staff dashboard refreshes orders by polling. The code also supports authenticated Socket.IO rooms on long-running hosts; the Vercel client build disables Socket.IO.
6. When the order is ready, the student can show a short-lived QR or the existing four-digit code. Staff verification is single-use; payment remains a separate counter action.
7. After collecting an item, a student/teacher can review it. Discover offers bounded budget suggestions, matching canteen prices, and a deterministic assistant that only reads the signed-in user's order status.
8. Admins manage canteens, staff assignments, blocked users, owner password resets, reviews, audit events, and reports. The first no-show blocks a student; staff record the full order amount as paid before unblocking.

## Architecture

```text
React + Vite browser
  | Axios: JSON API + HttpOnly-cookie session
  | Vercel API URL or same-origin /api routing
  v
Express / Node API (Vercel)
  | protect -> authorize -> canManageCanteen
  | controllers and Mongoose models
  v
MongoDB Atlas (external)
```

The browser uses HTTP for reads and changes. On Vercel, the UI polls every 30 seconds; Socket.IO is disabled by the Vercel build. The code supports Socket.IO on a long-running Node host. The owner reports that the deployed site works, but this workspace has not independently checked the live domains, Vercel environment settings, or Atlas connection.

## Technical challenges and honest answers

- **Per-canteen daily order numbers:** `Counter` uses a document key combining canteen id and India-local date. `findOneAndUpdate` with `$inc` increments the sequence atomically, so separate canteens have independent numbers.
- **Canteen ownership:** role middleware limits staff/admin endpoints, and controller checks use `canManageCanteen` for the target canteen/order. Staff can manage only their assigned canteens; admin can manage all.
- **Price tampering:** the client sends menu item ids and quantities, not trusted prices. The server loads current menu prices and saves name/price snapshots in the order.
- **Pickup verification:** the server generates a four-digit fallback code and also supports owner-issued random QR tokens. QR hashes (not raw tokens) are stored; tokens expire, assigned staff are checked, and an atomic state transition permits one collection. Failed code attempts are limited.
- **Verified reviews:** a student/teacher must own a collected order containing the reviewed item. A unique index prevents duplicate reviews per order/item/user; hidden reviews do not affect public ratings.
- **Bounded assistant/recommendations:** no external AI or paid service is called. Budget combinations use integer paise and capped search; order status uses only the authenticated user's active order.
- **Audit trail:** consequential mutations record actor, role, target, request ID, and allowlisted metadata; passwords, pickup codes, QR tokens, and free-form review text are excluded.
- **Offline/PWA:** the service worker caches static assets and an offline page only; it never caches authenticated API data or queues orders.
- **Live updates:** the server authenticates Socket.IO connections with the cookie. Users join their own room; staff can join only assigned canteen rooms. The event payload excludes pickup codes. Vercel builds disable sockets, so the deployed UI uses polling.
- **Slot limits:** order creation uses a MongoDB transaction and per-user/per-canteen write locks around active-order and slot checks. Unit tests cover the transaction path with stubs; concurrency still needs a database-backed test on a replica-set database.
- **Single-to-multi-canteen migration:** the migration script creates/reuses CampusBites, assigns legacy menu items/orders without a canteen, assigns existing canteen staff, and copies old counters using the greater sequence. A backup and a test-database run are still important before any real migration.
- **No-show handling:** automatic and manual paths share `markNoShow`; the first no-show blocks the account. Payment is recorded by staff at the counter and must be recorded before unblocking. The no-show order update and user block are in a MongoDB transaction. On Vercel, verify an external trusted scheduler calls the protected no-show endpoint every minute; the in-process cron is for long-running servers.

## Design decisions and trade-offs

- **No online payment:** the project is for pickup and payment at the canteen counter. Cash and UPI are recorded by staff; there is no payment provider or gateway.
- **Polling plus Socket.IO:** the Vercel UI uses polling every 30 seconds. The source also supports Socket.IO on long-running deployments, but the Vercel build disables it.
- **Separate `status` and `paymentStatus`:** food workflow and whether money was received are different facts. An order can be collected but still unpaid; marking collected does not automatically mark payment received.
- **One canteen per cart:** this keeps one order routed to one kitchen/counter and one pickup slot.
- **External Atlas:** Compose starts the app services but does not replace the existing cloud database. That preserves the project's database setup.
- **HttpOnly cookie session:** the JWT is not exposed to browser JavaScript. If the client/API use different domains, cookie behavior must be checked in real browsers; same-origin routing is preferable.

## 20 likely interview questions

1. **What problem does this solve?** It lets campus users order before arriving and collect at the counter, reducing queue time.
2. **Why did you choose MERN?** I wanted one JavaScript stack and already knew its basics.
3. **What does the frontend do?** React renders role-specific pages and calls the JSON API through Axios.
4. **What does the backend do?** Express authenticates requests, enforces rules, reads/writes MongoDB, and emits live updates.
5. **How do users log in?** The server compares a bcrypt hash and returns a signed JWT.
6. **How do you stop self-registering as admin?** Registration does not accept a role; it creates the default student role.
7. **How is a canteen's data isolated?** The server checks the staff role and assigned canteen before returning or changing its data.
8. **Can the browser choose the order price?** No. The server loads menu prices and calculates the total.
9. **Why store item snapshots?** Old orders keep their original names and prices after menu edits.
10. **How are order numbers generated?** An atomic MongoDB counter is scoped to a canteen and IST date.
11. **How does pickup verification work?** The owner can show a short-lived QR token or the existing code; assigned staff verify it and the server atomically allows one collection.
12. **How do you prevent QR exposure/replay?** Only a hash is stored, the token expires, the order must still be ready, and successful collection consumes it.
13. **How do live updates work?** Vercel uses 30-second polling; the code also supports authenticated Socket.IO rooms on long-running hosts.
14. **Why keep polling?** It is the deployed Vercel behavior and a fallback when sockets are unavailable or a phone sleeps.
15. **How do pickup slots work?** They are ten-minute windows; the server checks active orders against `slotLimit` inside its order transaction.
16. **Is the slot limit race-proof?** The code uses transaction locks to prevent concurrent overbooking; this still needs a database-backed concurrency test.
17. **Why are status and payment separate?** Food can be collected while the counter payment is still pending.
18. **What is the current no-show rule?** A manually or automatically recorded first no-show blocks the account; staff record the full order total as counter-paid before unblocking.
19. **How did you migrate to multiple canteens?** The migration script attaches legacy unassigned records to CampusBites, assigns staff, and copies counters.
20. **What is not finished?** The owner reports Vercel deployment is working. Real-device tests, pilot, database-backed API/concurrency tests, frontend component tests, external no-show scheduler verification, backup/restore rehearsal, and rollback testing still need confirmation. Helmet and login/register/pickup-code limits are implemented.

## Resume bullets

- Built a React/Vite and Express/Mongoose pre-order platform with student, staff, and admin roles.
- Implemented server-side order validation, menu-price recalculation, item snapshots, and pickup-code verification.
- Added expiring single-use QR pickup, collected-order-verified reviews, deterministic budget/canteen tools, and admin audit history.
- Added per-canteen order ownership, IST daily counters, ten-minute pickup slots, and 30-second polling; the code supports Socket.IO on long-running hosts.
- Created staff sales reports and admin workflows for canteens, staff assignments, blocked users, and password resets.
- Configured development Docker Compose, GitHub Actions validation, and Vercel deployment support. The owner reports the site is deployed; do not claim real users, phone testing, or a successful pilot without evidence.

## Two-minute live demo script

Use safe test accounts and test data only. Do not demonstrate with real student data or production credentials.

- **0:00–0:20:** Sign in as a test student; choose a canteen and show search/category filters and menu details.
- **0:20–0:40:** Add an item, show the one-canteen cart, choose a pickup slot, and place the order.
- **0:40–1:05:** Sign in as assigned test staff; show the live order, prepare it, and mark it ready.
- **1:05–1:25:** Return to the student view and show the ready status and pickup code. Explain that staff verify the code at the counter.
- **1:25–1:45:** Show staff payment confirmation and the sales report; explain that cash/UPI is counter-only.
- **1:45–2:00:** Show the admin view and explain staff/canteen ownership. Mention the Vercel deployment only as owner-verified; be honest about any remaining phone, pilot, backup, or rollback checks.
