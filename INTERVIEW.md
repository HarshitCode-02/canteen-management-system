# Interview Guide

Use this as a practice guide, not a script to memorize. Be clear about what is implemented versus what has not been tested or deployed.

## 30-second pitch

I am building a MERN pre-order platform for college canteens. Students and teachers can choose a canteen, browse its menu, select a pickup slot, and collect their order at the counter. There is no delivery or online payment. Staff get a live order dashboard, and admins manage canteens and staff. I used JWT role checks, per-canteen ownership checks, server-side price calculation, pickup codes, Socket.IO updates, and MongoDB. The code is in active development; real-phone testing and deployment are still pending.

## Two-minute walkthrough

1. A student signs in and chooses one active canteen.
2. The menu shows categories, search, images, popular items, specials, rush, and an estimated wait.
3. The cart holds one canteen's items. The student chooses one of the available pickup slots and can add a short note.
4. The API checks the user, canteen status, item availability, active-order rule, and slot capacity. It looks up prices from MongoDB, saves item snapshots, increments a per-canteen/day counter, and creates a pickup code.
5. The staff dashboard receives a Socket.IO event in that canteen's room and reloads the orders. It also polls every 30 seconds in case the socket disconnects.
6. Staff move an order from placed to preparing to ready. The student shows the pickup code; staff verify it at collection and separately record cash/UPI received at the counter.
7. Admins manage canteens, staff assignments, blocked users, owner password resets, and canteen reports. The first no-show blocks a student; staff record the full order amount as paid before unblocking.

## Architecture

```text
React + Vite browser
  | Axios: JSON API + bearer JWT
  | Socket.IO: JWT-authenticated live events
  v
Express / Node server
  | protect -> authorize -> canManageCanteen
  | controllers and Mongoose models
  v
MongoDB Atlas (external)
```

The browser uses HTTP for reads and changes. Socket.IO carries small update notifications; clients refetch the full data over HTTP. The database is MongoDB Atlas, not a local Compose database.

## Technical challenges and honest answers

- **Per-canteen daily order numbers:** `Counter` uses a document key combining canteen id and India-local date. `findOneAndUpdate` with `$inc` increments the sequence atomically, so separate canteens have independent numbers.
- **Canteen ownership:** role middleware limits staff/admin endpoints, and controller checks use `canManageCanteen` for the target canteen/order. Staff can manage only their assigned canteens; admin can manage all.
- **Price tampering:** the client sends menu item ids and quantities, not trusted prices. The server loads current menu prices and saves name/price snapshots in the order.
- **Pickup code abuse:** the server generates a four-digit code with Node's secure `crypto.randomInt`; it hides the code from staff responses and limits verification to five wrong attempts per order. Further attempts return 429.
- **Live updates:** the server authenticates Socket.IO connections with JWT. Users join their own room; staff can join only assigned canteen rooms. The event payload excludes pickup codes. Polling is the fallback.
- **Slot limits:** the server checks active orders in each ten-minute slot against `slotLimit`. This is a count-then-insert check, not an atomic reservation, so concurrent requests can exceed the limit. I would address this before relying on it under heavy traffic.
- **Single-to-multi-canteen migration:** the migration script creates/reuses CampusBites, assigns legacy menu items/orders without a canteen, assigns existing canteen staff, and copies old counters using the greater sequence. A backup and a test-database run are still important before any real migration.
- **No-show handling:** automatic and manual paths share `markNoShow`; the first no-show blocks the account. Payment is recorded by staff at the counter and must be recorded before unblocking. Blocking and order status are separate database writes, so they are not transactionally atomic.

## Design decisions and trade-offs

- **No online payment:** the project is for pickup and payment at the canteen counter. Cash and UPI are recorded by staff; there is no payment provider or gateway.
- **Polling plus Socket.IO:** sockets make order changes feel immediate; 30-second polling makes the UI recover if a phone sleeps or loses its socket.
- **Separate `status` and `paymentStatus`:** food workflow and whether money was received are different facts. An order can be collected but still unpaid; marking collected does not automatically mark payment received.
- **One canteen per cart:** this keeps one order routed to one kitchen/counter and one pickup slot.
- **External Atlas:** Compose starts the app services but does not replace the existing cloud database. That preserves the project's database setup.
- **JWT in localStorage:** simple for this learning project, but exposed to JavaScript if the site has an XSS issue. A production security review is still needed.

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
11. **How does pickup verification work?** Staff enter the student's code; the server checks it before marking the order collected.
12. **How do you limit code guessing?** The code has five attempts; further verification attempts return 429.
13. **How do live updates work?** Authenticated Socket.IO rooms receive small events, and the UI refetches current data.
14. **Why keep polling?** It is a fallback when a socket disconnects or a phone sleeps.
15. **How do pickup slots work?** They are ten-minute windows; the server counts active orders and compares the count with `slotLimit`.
16. **Is the slot limit race-proof?** Not currently; count and insert are separate operations, so simultaneous requests can exceed it.
17. **Why are status and payment separate?** Food can be collected while the counter payment is still pending.
18. **What is the current no-show rule?** A manually or automatically recorded first no-show blocks the account; staff record the full order total as counter-paid before unblocking.
19. **How did you migrate to multiple canteens?** The migration script attaches legacy unassigned records to CampusBites, assigns staff, and copies counters.
20. **What is not finished?** Real-device tests, pilot, deployment, API integration tests, frontend component tests, rate limiting, Helmet, and slot-race protection.

## Resume bullets

- Built a React/Vite and Express/Mongoose pre-order platform with student, staff, and admin roles.
- Implemented server-side order validation, menu-price recalculation, item snapshots, and pickup-code verification.
- Added per-canteen order ownership, IST daily counters, ten-minute pickup slots, and Socket.IO updates with polling fallback.
- Created staff sales reports and admin workflows for canteens, staff assignments, blocked users, and password resets.
- Configured development Docker Compose and GitHub Actions CI; deployment and real-user testing remain pending.

## Two-minute live demo script

Use safe test accounts and test data only. Do not demonstrate with real student data or production credentials.

- **0:00–0:20:** Sign in as a test student; choose a canteen and show search/category filters and menu details.
- **0:20–0:40:** Add an item, show the one-canteen cart, choose a pickup slot, and place the order.
- **0:40–1:05:** Sign in as assigned test staff; show the live order, prepare it, and mark it ready.
- **1:05–1:25:** Return to the student view and show the ready status and pickup code. Explain that staff verify the code at the counter.
- **1:25–1:45:** Show staff payment confirmation and the sales report; explain that cash/UPI is counter-only.
- **1:45–2:00:** Show the admin view and explain staff/canteen ownership. State honestly that real phones, pilot, and production deployment are pending.
