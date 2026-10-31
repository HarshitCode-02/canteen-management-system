# CampusBites API integration guide

## Base URL and authentication

- The web client uses `/api` on the same origin. Vercel rewrites `/api/*` to the server; local development may use `VITE_API_URL`.
- Browser requests use `withCredentials: true` and an HttpOnly `canteenAuth` cookie. JavaScript cannot read this cookie. Do not send a bearer token or store a session token in local storage.
- The cookie is Secure outside development. Unsafe methods require an allowed `Origin`; API deployments must configure their exact client origins.
- A future native app needs an explicitly designed native authentication flow. Cookie behavior and CSRF requirements must not be bypassed.

## Response conventions

- JSON success responses retain route-specific shapes.
- Errors use `{ "message": "..." }`; production 5xx responses return a generic message.
- Authenticated user data is derived from the session cookie. Role checks and canteen ownership are enforced server-side.
- No global API version prefix is currently configured. The base path is `/api`.

## Main endpoint groups

| Method/path | Access | Purpose |
|---|---|---|
| `POST /api/auth/register`, `/login`, `/logout` | Public; rate-limited registration/login | Create account, establish/clear cookie session |
| `GET /api/auth/me`, `PATCH /api/auth/me`, `PATCH /api/auth/password` | Authenticated | Session/profile/password operations |
| `GET /api/canteens`, `GET /api/canteens/:id`, `GET /api/canteens/:id/menu`, `GET /api/canteens/:id/slots` | Public | Browse canteens, menus, current slots |
| `GET /api/menu` | Public | Menu listing |
| `POST /api/orders` | Authenticated | Place an order using menu item IDs, quantities, pickup time, optional note |
| `GET /api/orders/my` | Authenticated | Latest 50 orders for current user |
| `PATCH /api/orders/:id/cancel`, `/late`; `POST /api/orders/:id/pickup-qr` | Authenticated owner | Owner-scoped order actions |
| `GET /api/orders`, `/report`; status/payment/pickup verification routes | Canteen staff/admin, ownership checked | Staff operations and reports |
| `GET /api/reviews/menu/:menuItemId` | Public | Visible reviews; 20 per page with `?page=N` |
| `POST /api/reviews`, `GET /api/reviews/my` | Student/teacher | Verified review actions |
| `/api/admin/*` | Admin | Staff, canteen, moderation, analytics and audit administration |
| `/api/smart/*` | Student/teacher | Meal suggestions and deterministic assistant |

## Order creation

Request body:

```json
{
  "items": [{ "menuItemId": "MongoObjectId", "qty": 2 }],
  "pickupTime": "ISO-8601 timestamp",
  "note": "Optional instruction"
}
```

The client sends a unique `Idempotency-Key` header. The server replays the saved order for a matching key and payload; reusing the key with a different payload returns a conflict. Prices and canteen ownership come from the server-side menu records.

Successful responses include the saved order and server-calculated total. The client should verify the order ID/order number before presenting success. A network timeout is ambiguous: retry the exact same payload with the same idempotency key; do not create a fresh key until the payload changes.

## Pagination, live updates, and errors

- Public item reviews support `page` (20 rows per page); admin reviews support page-based pagination.
- `GET /api/orders/my` currently has a fixed latest-50 limit; it does not yet expose search/date/status filters or pagination.
- Socket.IO is available only where a long-running server initializes it. The Vercel serverless deployment currently uses in-app API polling and has no closed-app push delivery.
- See `server/routes` and `docs/SECURITY-ROUTE-AUDIT.md` for authoritative route middleware/ownership details.
