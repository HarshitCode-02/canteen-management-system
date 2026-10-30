# API access and ownership audit

Reviewed against the route middleware and controller checks in the current `multi-canteen` workspace. Recheck this list whenever routes or controllers change.

| Route group | Allowed callers | Ownership/data scope |
|---|---|---|
| `GET /api/health` | Public | Reports API/database readiness; no records returned |
| `POST /api/auth/register`, `POST /api/auth/login` | Public | Registration assigns the default student role; role is not accepted from the client |
| `GET /api/auth/me`, `PATCH /api/auth/password` | Authenticated user | User record comes from the JWT; password change verifies the current password |
| `GET /api/canteens`, `GET /api/canteens/:id`, `GET /api/canteens/:id/menu`, `GET /api/canteens/:id/slots` | Public | Active canteens/menu/slot counts only where the controller filters active records; no private user data |
| `POST /api/canteens`, `PATCH /api/canteens/:id` | Admin | Admin-only middleware; IDs validated in update |
| `PATCH /api/canteens/:id/open`, `GET /api/canteens/:id/blocked`, `PATCH /api/canteens/:id/unblock/:userId` | Canteen staff/admin | Role middleware plus `canManageCanteen` check for the target canteen |
| `GET /api/menu` | Public | Menu is public; optional canteen query ID is validated |
| `POST /api/menu`, `PATCH /api/menu/:id`, `DELETE /api/menu/:id` | Canteen staff/admin | Role middleware plus assigned-canteen ownership checks |
| `POST /api/orders`, `GET /api/orders/my`, `PATCH /api/orders/:id/cancel`, `PATCH /api/orders/:id/late` | Authenticated user | Create uses the JWT user; list is filtered to the JWT user; cancel/late mutations verify order ownership |
| `GET /api/orders`, `GET /api/orders/report`, status/verify/payment mutations | Canteen staff/admin | Role middleware; requested canteen or order is checked with `canManageCanteen` |
| `/api/admin/*` | Admin | `router.use(protect, authorize("admin"))` covers every admin route; owner IDs are validated before mutations |
| Socket.IO user/canteen rooms | Authenticated socket | JWT verified; canteen room join validates ObjectId and `canManageCanteen`; payload excludes pickup codes |

## Still required

- Package-based security hardening (Helmet and login/register rate limits) is pending explicit approval to add dependencies.
- Add automated API tests for unauthorized roles, cross-canteen access, order transitions, report output, password changes, and invalid input.
- Test production CORS, HTTPS, proxy/WebSocket behavior, Atlas access restrictions, and secret configuration in the hosting dashboards.
- This code review is not a substitute for penetration testing or a production security certification.
