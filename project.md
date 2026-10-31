# CampusBites Project Handover

## Project summary

BBDU college canteen pre-order platform built with MERN. Students and teachers choose a canteen, browse its menu, place an order for a pickup time, collect it at the counter, and pay cash/UPI there. No delivery or online payment gateway.

The owner reports the current multi-canteen app is deployed on Vercel and working. This repository cannot independently verify production URLs, environment settings, scheduler configuration, real-device behavior, or a successful canteen pilot. Do not claim real users or completed training unless confirmed.

## Safe working rules

- Never request, print, or commit `.env` values, passwords, MongoDB URIs, JWTs, tokens, or API keys.
- `main` contains the deployed multi-canteen product. Do new development on a feature branch created from current `main`; merge to `main` only after review and approval.
- Never force-push. Preserve unrelated worktree changes. Never run seed/migration scripts against production without an independently verified backup and explicit approval.
- Inspect the relevant files before editing. Make small changes; do not rewrite features or add packages without approval.
- Show actual commands and results. Do not call a check passed unless it was run.
- This is a solo B.Tech CSE project; keep guidance clear and concise.

## Stack and layout

- `client/`: React JSX, Vite, React Router, Axios, plain CSS.
- `server/`: Node.js, Express, MongoDB/Mongoose, JWT in an HttpOnly cookie, bcryptjs, CORS, Socket.IO and node-cron for long-running hosting.
- `server/models/`: User, Canteen, MenuItem, Order, Counter.
- `server/controllers/`, `routes/`, `middleware/`: APIs and access control.
- `server/test/`: built-in Node test runner (`node:test`).
- `docs/`: phone test, staff guide, pilot, security route audit, go-live checklist.
- `.github/workflows/ci.yml`: validation workflow; it does not deploy to Vercel.
- Root and service-level Vercel config files describe routing/build behavior. Verify current Vercel project settings before changing deployment config.

## Roles and core rules

- Roles: student, teacher, canteen staff, admin. Registration cannot create privileged roles.
- Staff can manage only their assigned canteens; admin can manage all.
- A cart/order belongs to one canteen. The server recalculates prices from MongoDB.
- Order states: `placed -> preparing -> ready -> collected`; payment is tracked separately and is recorded at the counter.
- Pickup codes are for the order owner and verified by staff; verification is rate-limited.
- First recorded no-show blocks immediately. Staff record payment for all unpaid no-show orders before unblocking.
- The default no-show timer is 20 minutes after ready (30 minutes after the running-late extension). On Vercel, an external trusted scheduler must call the protected `GET /api/internal/no-show` endpoint every minute with `CRON_SECRET`; in-process cron is not persistent in a serverless function.
- Dashboard and My Orders poll every 30 seconds. Vercel builds disable Socket.IO; long-running server builds can use the cookie-authenticated socket feature.

## Deployment and configuration

The owner reports the app is deployed on Vercel. Source supports `VITE_API_URL` for the frontend API base (include `/api`) or same-origin `/api` routing. The backend uses `CLIENT_URL` for browser-origin checks. These are configuration names only; set values privately in Vercel and never paste them into chat or docs.

Before changing Vercel rewrites, project root directories, or domains, inspect the actual Vercel dashboard. If frontend and API are on different domains, test cookie login in real browsers; same-origin proxy/routing is preferable. Verify the external no-show scheduler, Atlas access, backups, and rollback plan before handover.

## Checks

Run from the repo root:

```bash
npm --prefix server test
npm --prefix client run lint
npm --prefix client run build
```

Backend tests are dependency-light and do not connect to production MongoDB. The client has no automated test runner yet. CI also checks backend JavaScript syntax and builds the development Docker images; it does not publish images or deploy. A green local build is not proof of live production behavior.

## Handover priorities

1. In Vercel, confirm production client/API URLs and private environment-variable names are configured correctly; never share values.
2. Verify `/api/health`, cookie login and refresh for student, staff, and admin accounts.
3. Place a designated test order; verify staff status changes, pickup code, counter payment, and order history.
4. Confirm polling updates and the trusted minute no-show scheduler; verify block/payment/unblock behavior.
5. Test the main flows on the actual staff phone and rehearse a rollback/backup restore.
6. Only after the handover checks, prioritize measured pilot feedback over speculative features.

## Suggested next development branch

Create a feature branch from the deployed `main`, for example `feature/post-handover-improvements`. Keep `main` deployable; merge small, tested pull requests after approval.
