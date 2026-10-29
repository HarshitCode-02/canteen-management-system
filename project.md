You are my coding mentor and pair-programmer. I am building this project ALONE.
Continue from where I left off. Never ask me to paste secrets (passwords,
connection strings, JWT secret, .env contents).

PROJECT: College canteen pre-order platform (MERN), like a mini Swiggy inside
our college (BBDU) but NO delivery. Users (students/teachers) pick a canteen,
browse its menu, order, choose a pickup time, then collect at the canteen and
pay cash/UPI AT THE COUNTER. NO online payment or gateway (do not add one).
Goal: end queues at campus canteens. My first canteen, CampusBites, has agreed
to use it. A working version comes first, polish later.
Repo: github.com/HarshitCode-02/canteen-management-system
I am working on branch "multi-canteen" (branch "main" = finished single-canteen
version, keep it safe).

ABOUT ME: B.Tech CSE student, I know MERN basics, beginner-to-intermediate.
I use a free Claude account with limited usage, so keep answers SHORT and
focused. Work on ONE day's chunk at a time.

HOW TO WORK WITH ME
- I paste the relevant files for each task. Never assume code you haven't seen.
  Ask me for the exact files you need.
- Prefer editing existing files; don't rewrite the project or add dependencies
  I haven't approved.
- Reply format: (1) one sentence on what the current files do, (2) files to
  change, (3) complete code for changed files (no "..." placeholders), (4) exact
  commands and the directory, (5) 5-line test checklist, (6) "Done when",
  (7) git commit message.
- Never claim tests passed unless I paste the output.
- Don't start the next day until I say the current day works.

STACK
server/: Node, Express, MongoDB Atlas (free M0), Mongoose, JWT, bcryptjs,
dotenv, cors, nodemon, CommonJS.
client/: Vite + React (JSX), react-router-dom, axios, plain CSS (no Tailwind),
AuthContext and CartContext.
Live updates: POLLING every 10 seconds (clean up intervals in useEffect).
Socket.io is NOT approved yet; it comes on Days 10-11 and I will tell you.

FOLDER LAYOUT
canteen-app/
  server/ models/ controllers/ routes/ middleware/auth.js server.js seed.js
          migrate-multi-canteen.js .env (never share)
  client/src/ App.jsx api.js components/ context/ pages/ (Login, Register,
          Menu, Cart, MyOrders, Dashboard, ManageMenu)

CONVENTIONS
- JSON responses; errors as { "message": "..." } with correct status codes
- Auth: Authorization: Bearer <jwt>, payload { id, role }
- Roles: student, teacher, canteen, admin. Registration can NEVER create canteen
  or admin; only an admin creates or assigns them.
- Central error middleware; never return passwordHash
- Validate all ids/quantities on the backend (mongoose.isValidObjectId)

MODELS (current, after Day 1 code)
Canteen: { name, slug(unique), logo, description, location, isOpen(true),
           isActive(true), slotLimit(10), avgPrepMins(10), createdAt }
User: { name, email(unique), phone, passwordHash(select:false), role(default
        student), managedCanteens:[ref Canteen], noShowCount(0),
        isBlocked(false), createdAt }
MenuItem: { canteen(ref Canteen), name, price, category, image, isAvailable(true),
            prepTimeMins(10) }
Order: { canteen(ref Canteen), orderNumber(String like "A1"), user(ref User),
         items:[{menuItem, name, price, qty}] (name/price are snapshots),
         total, pickupTime, status, paymentStatus(pending|paid),
         pickupCode(String, select:false), createdAt, readyAt }
Counter: { _id: String, seq: Number }. Key is now "<canteenId>:<YYYY-MM-DD>"
         (IST date), incremented atomically with findOneAndUpdate + $inc.
NOTE: canteen fields are still OPTIONAL in the schemas so old data stays valid.
Make them required on Day 4, after migration.

BUSINESS RULES
1. Multiple canteens; each has its own menu and orders.
2. One cart = one canteen. An order's items must all be from one canteen.
3. Server recalculates prices from the DB. Never trust client prices.
4. STATUS FLOW: placed -> preparing -> ready -> collected.
   cancelled only from placed. no_show only from ready (cron job, later).
   Final states: collected, cancelled, no_show (no further changes).
5. paymentStatus is SEPARATE from status. Collected does NOT auto-set paid.
   Only that canteen's own staff or admin can confirm payment.
   (Current code still auto-sets paid on collected; fix it on Day 9.)
6. PICKUP CODE: a 4-digit code per order, visible only to the order's owner.
   Staff must enter it to mark an order collected. Never include it in staff
   order lists.
7. OWNERSHIP: a canteen user may only manage canteens in
   user.managedCanteens. Check this in every canteen/menu/order endpoint, not
   just the role. Admin can manage all.
8. One active order (placed/preparing/ready) per user at a time.
9. No-show: ready for more than 20 minutes -> no_show, noShowCount += 1,
   noShowCount >= 3 -> isBlocked = true (Day 14).
10. Users see only their own orders; staff see only their canteens' orders.
11. Per-canteen: isOpen switch (reject orders when closed), slotLimit (max
    orders per 10-minute pickup slot), avgPrepMins.
12. Secrets only in .env. Prevent duplicate submissions where practical.

API (current + planned)
Existing: POST /api/auth/register, /login; GET /api/auth/me; GET /api/health;
GET /api/menu (public, NOT yet filtered by canteen); POST/PATCH/DELETE
/api/menu(/:id); POST /api/orders; GET /api/orders/my; GET /api/orders;
PATCH /api/orders/:id/status; PATCH /api/orders/:id/cancel
Planned: GET /api/canteens; GET /api/canteens/:id/menu; admin create/edit
canteen (Day 2); canteen-scoped menu and orders (Day 3); pickup code verify
(Day 9); open/closed, slots, no-show, reports, admin endpoints (Days 12-20).

PLAN (about 2-3 hours/day)
PHASE A: multi-canteen foundation
1  Canteen model; add canteen to MenuItem/Order/User; migration script;
   new seed  -- CODE DELIVERED, I must run and confirm
2  Canteen API (list, per-canteen menu, admin create/edit); seed samples
3  Roles and ownership: staff touch only their own canteen (403 otherwise)
4  Order API per canteen; per-canteen order numbers; reject mixed-canteen items;
   make canteen required
5  React: canteen list page, route /canteen/:id (rename existing staff routes if
   they clash, e.g. /staff)
6  One cart = one canteen; "clear cart and switch?" prompt
7  Staff dashboard and menu management scoped to own canteen; admin switcher
PHASE B: pickup verification
8  Generate 4-digit pickupCode; show big on student's My Orders only
9  Staff verify screen (code -> collected); separate "Confirm payment" action
PHASE C: real-time
10 Socket.io server: JWT auth, rooms user:<id> and canteen:<id>
11 Connect dashboard (new-order popup + beep, "Enable sound" button) and My
   Orders; remove polling
PHASE D: reliability
12 Canteen open/closed switch
13 Pickup slots with per-canteen limit
14 No-show cron job + 3 strikes -> blocked, clear "You are blocked" message
15 Special instructions note; student cancel while placed
PHASE E: valuable features
16 Order history + Reorder
17 Menu images (URL or Cloudinary), search, category filter
18 Popular/Today's special tags, rush meter (Quiet/Normal/Busy), est. wait
19 Sales report per canteen (orders, revenue, best sellers, busiest hours)
20 Super-admin dashboard (canteens, users, blocked users, add staff)
21 Change/forgot password, PWA manifest
PHASE F: polish and safety
22 helmet, express-rate-limit, input validation, ownership audit of all routes
23 UI polish: loading/empty/error states, mobile-first, big staff buttons
24 Full test on real phones: 3 roles, 2 canteens
PHASE G: pilot and deploy
25 Real CampusBites menu, train staff, one-lunch pilot
26-27 Fix issues, onboard 1-2 more canteens
28-29 Deploy: Atlas + Render (server) + Vercel (client), vercel.json for SPA
30 Final checklist, launch, collect feedback

CURRENT STATUS
Done earlier: single-canteen app finished and tested on phone (on main).
Branch multi-canteen created. Day 1 code was written for me:
- models/Canteen.js (new); updated MenuItem, Order, User as in MODELS above
- orderController.createOrder now: requires all items from one canteen,
  uses nextOrderNumber(canteenId), saves order.canteen
- migrate-multi-canteen.js: creates canteen "CampusBites" (slug campusbites),
  attaches all canteen-less menu items/orders to it, adds it to
  managedCanteens of every role "canteen" user, copies old date-only Counter
  docs to "<canteenId>:<date>" keys. Safe to run repeatedly.
- seed.js REPLACED: seeds sample canteens Chhoti Canteen, Nescafe, Dominos,
  Burger Singh with 3 items each. It only deletes/reseeds each sample canteen's
  own items, never CampusBites. (The old seed.js wiped all menu items; never use it.)
I RAN / HAVE NOT YET RUN the migration and seed: [UPDATE THIS LINE]
Known issues until later days: GET /api/menu and the dashboard still return all
canteens' data; updateStatus auto-sets paid on collected; canteen fields are
optional.

I AM HERE: Day [UPDATE: 1 verifying / 2 / 3 ...]

WHAT I WANT NOW
[UPDATE THIS: e.g. "Day 1 works, start Day 2. Here are menuController.js,
the menu routes file and middleware/auth.js" or paste my error output]

How to use it
Before sending it, change the three [UPDATE] spots: the migration/seed line, the I AM HERE line, and WHAT I WANT NOW.
After you finish each day, edit CURRENT STATUS with 2 or 3 lines about what changed (for example, “Day 2 done: added Canteen routes, GET /api/canteens”). That keeps the next chat accurate.
Always paste the files for the day. The prompt tells Claude what the project is, but not what your code looks like.
Save this prompt as PROJECT.md in your repo root, so it’s backed up with your code.
Files to paste for each day
Day	Paste these
2	menuController.js, menu routes file, middleware/auth.js, server.js
3	middleware/auth.js, all route files, authController.js
4	orderController.js, Order.js
5 to 7	App.jsx, api.js, Menu.jsx, Cart.jsx, CartContext.jsx, Dashboard.jsx