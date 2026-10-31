# CampusBites performance audit

**Audit date:** 2026-10-31

## Confirmed checkout lifecycle

1. Express request middleware awaits the shared Mongoose connection before the route handler.
2. `POST /api/orders` validates input, starts a MongoDB session, and runs an order transaction.
3. The transaction serializes user/canteen ordering, checks an active order and menu availability, counts slot usage, allocates a daily counter, saves the order, and writes its audit record.
4. Socket notification is emitted after the transaction commits.
5. The client clears its cart only after it receives and validates the saved order response.

These are observable code paths, not proof of which step caused the reported 30-second delay. A serverless cold start can also occur before Express middleware executes.

## Measurement added

Request-completion logs include request ID, method, route path, HTTP status, total elapsed milliseconds, and database connection wait milliseconds. Successful order logs include elapsed controller/transaction time and stage durations for idempotency lookup, user/active-order checks, menu validation, canteen/slot checks, and save/audit.

Logs intentionally exclude request bodies, account identifiers, notes, secrets, and pickup credentials. Use the same `X-Request-ID` to correlate a client report with server timings.

## Checkout reliability changes

- Client submissions are disabled while in progress and show an explicit status.
- A SHA-256 payload fingerprint associates a persisted random request key with the exact cart/slot/note. A retry of the same request reuses the key.
- The server stores the key/fingerprint with the order and enforces a partial unique index per user. Replays return the original order; key reuse with a different payload is rejected.
- Cart state is retained for errors/ambiguous network responses. Successful confirmation includes order number, pickup time, and server-calculated total.
- Capacity, authorization, transaction and active-order protections were not removed.

## Results and limitations

- The Vite production build emitted an approximately 454 KB JavaScript entry chunk (140 KB gzip) and a 477 KB chunk (125 KB gzip). This is a bundle-size signal, not a Core Web Vitals measurement; route-level transfer and device/network impact were not measured.
- Mocked transaction controller tests passed; their timings are not representative of MongoDB Atlas or Vercel and are not performance measurements.
- No before/after production latency, median, p95, cold-start time, database wait, or request-volume data was available.
- Do not claim the 30-second delay is fixed until representative staging/pilot telemetry confirms it. Collect timing logs for normal, slow, and failed requests and compare platform latency with `dbWaitMs` and transaction stages.
- The backend full test suite's listener-dependent tests could not bind ports in this environment (`EPERM`).
