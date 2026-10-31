# Fixes implemented

**Work status:** local, uncommitted changes on `main`; no push or deployment performed.

## Security

- Added exact allowed-origin checking to Socket.IO handshakes, including rejection of missing Origin headers.
- Added regression coverage for configured origin, same-origin custom host, malicious origin, missing origin, and invalid forwarded protocol.

## Checkout

- Added per-request database wait and overall HTTP timing logs, correlated by request ID.
- Added safe stage timings for order validation/transaction/save work. No request payload or secret values are logged.
- Added a server idempotency key and payload fingerprint with a unique per-user partial index. Same-request retries return the saved order; key reuse with changed order data is rejected.
- Added client retry-key persistence, duplicate-submit blocking, explicit loading/error states, and a server-confirmed order summary.
- The cart is not cleared on errors or ambiguous responses.

## Mobile experience and status updates

- Added a cart icon/count and responsive authenticated-name/initials area beside the hamburger menu.
- Made cart line controls touch-friendly and responsive.
- Added app-wide status refresh/notifications, 30-second polling, focus/visibility/reconnect refresh, and opt-in browser alerts.
- Browser push while the app is closed is not implemented.

## Verification

- Focused backend tests: 11 passed.
- Frontend ESLint and production Vite build: passed.
- Backend JavaScript syntax check: passed.
- `git diff --check`: passed.
- Full backend suite: listener-dependent tests returned `EPERM` when binding local ports; not reported as passing.
- Real database concurrency, deployed latency, Vercel behavior, and mobile visual screenshots: not verified.
