# API access and ownership audit

Reviewed against the route middleware and controller checks in the repository. Recheck this list whenever routes or controllers change. This source audit does not verify the live Vercel settings.

| Route group | Allowed callers | Ownership/data scope |
|---|---|---|
| `GET /api/health` | Public | Reports API/database readiness; no records returned |
| `GET /api/internal/no-show` | Trusted scheduler | `cronAuth` requires the configured secret before running overdue-order processing |
| `POST /api/auth/register` | Public, 5 attempts/IP/hour | Registration assigns the default student role; role is not accepted from the client |
| `POST /api/auth/login` | Public, 10 attempts/IP/15 minutes | Generic invalid-credentials response; excess attempts receive 429 |
| `POST /api/auth/logout` | Public with allowed Origin | Clears the HttpOnly session cookie |
| `GET /api/auth/me`, `PATCH /api/auth/me`, `PATCH /api/auth/password` | Authenticated user | User record comes from the HttpOnly-cookie JWT; profile update only writes allowlisted fields; password changes verify the current password |
| `GET /api/canteens`, `GET /api/canteens/:id`, `GET /api/canteens/:id/menu`, `GET /api/canteens/:id/slots` | Public | Active canteens/menu/slot counts only where the controller filters active records; no private user data |
| `POST /api/canteens`, `PATCH /api/canteens/:id` | Admin | Admin-only middleware; IDs validated in update |
| `PATCH /api/canteens/:id/open`, `GET /api/canteens/:id/blocked`, `PATCH /api/canteens/:id/unblock/:userId` | Canteen staff/admin | Role middleware plus `canManageCanteen` check for the target canteen |
| `GET /api/menu` | Public | Menu is public; optional canteen query ID is validated |
| `POST /api/menu`, `PATCH /api/menu/:id`, `DELETE /api/menu/:id` | Canteen staff/admin | Role middleware plus assigned-canteen ownership checks |
| `POST /api/orders`, `GET /api/orders/my`, `PATCH /api/orders/:id/cancel`, `PATCH /api/orders/:id/late` | Authenticated user | Create uses the JWT user; list is filtered to the JWT user; cancel/late mutations verify order ownership |
| `GET /api/orders`, `GET /api/orders/report`, status/verify/payment mutations | Canteen staff/admin | Role middleware; requested canteen or order is checked with `canManageCanteen` |
| `/api/admin/*` | Admin | `router.use(protect, authorize("admin"))` covers every admin route; owner IDs are validated before mutations; password reset by email revokes existing sessions |
| Socket.IO user/canteen rooms | Authenticated socket | Cookie JWT verified; canteen room join validates ObjectId and `canManageCanteen`; payload excludes pickup codes |

## Still required

- Helmet security headers are enabled. Login/register are limited per IP, and failed pickup-code verification is limited to 30 attempts per authenticated staff account per 15 minutes; successful collections do not count. The in-memory limits reset on server restart. Throttling for other routes remains pending.
- Unsafe HTTP methods require an allowed `Origin`; Vercel deployment hostnames and same-origin requests are supported. Verify the actual `CLIENT_URL`, cookie behavior, and API/client domains in Vercel before handover.
- Order capacity and no-show/block changes now use MongoDB transactions. Concurrent behavior still needs database-backed verification against Atlas or a local replica set.
- Add automated API tests for unauthorized roles, cross-canteen access, order transitions, report output, password changes, and invalid input.
- Test production CORS, HTTPS, client/API cookie behavior, Atlas access restrictions, external no-show scheduler, and private secret configuration in Vercel.
- This code review is not a substitute for penetration testing or a production security certification.
