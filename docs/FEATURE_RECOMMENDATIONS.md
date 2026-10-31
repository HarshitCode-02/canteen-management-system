# CampusBites feature recommendations

## Already present

- Multi-canteen ordering, pickup slots, one-active-order protection, current-price validation, staff status/payment controls, no-show handling, reorder, QR pickup, verified reviews, menu availability/special flags, admin audit, sales summaries, and deterministic Discover tools.

## Prioritized next steps

### Critical

1. Deploy and verify the locally fixed Socket.IO Origin guard.
2. Verify the idempotency index exists in staging, then test timeout/retry and concurrent same-key submissions on a replica set.
3. Measure checkout in staging and production-like conditions before attempting query/index optimizations.
4. Review in-app status notices and the 30-second polling strategy during a real canteen pilot. Closed-site push requires a push service and service-worker subscription flow; do not imply it is currently supported.

### High

- Add status/date/canteen/order-number filters and cursor pagination to order history; current API returns only the latest 50 orders.
- Favorites can reuse menu item IDs but need a user-owned backend field/API, availability handling, and authorization tests.
- Reorder already fetches the current menu and skips unavailable items; continue requiring the user to select a currently available pickup slot and review the cart before submitting.
- Keep inventory as the existing availability toggle unless canteen operators need counts. Quantity stock requires atomic reservation, cancellation/no-show restoration, and concurrent transaction tests.

### Important

- Existing reports include order/payment summaries, cancelled/no-show counts, item rankings, and busy hours. Define revenue as paid amounts, and add prep-time/cancellation-rate metrics only after definitions and data quality are agreed.
- `isSpecial` is a boolean, not a scheduled promotion. Add start/end times only if staff need scheduled specials and timezone handling is tested.
- Canteens have `avgPrepMins`; treat it as an estimate, not a guaranteed ready time. Avoid workload polling until a validated model is available.
- Verified reviews already provide student feedback; keep public identities limited to the display name and avoid exposing reviewer contact information.

### Future mobile app

- Keep business validation and authorization in the backend.
- Current browser authentication is cookie-based and CSRF-Origin protected. Define a separate native-client authentication/token strategy before building a mobile client; do not reuse a browser cookie or put long-lived secrets in the app.
- Document API error and pagination conventions before adding `/api/v1`; versioning is not necessary solely for the current website.
