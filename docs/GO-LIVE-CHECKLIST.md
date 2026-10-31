# Production readiness and rollback checklist

## Before deploying

- [ ] Create a separate production MongoDB database; do not point production at local/test data.
- [ ] Restrict Atlas network access to the hosting provider's documented outbound addresses where possible; use a least-privilege database user.
- [ ] Create the Vercel project from the repository root on the reviewed `multi-canteen` branch; confirm the `client` and `server` services load from `vercel.json`.
- [ ] Confirm `/api/*` rewrites to the `server` service and all other paths rewrite to `client`; this keeps the HttpOnly cookie on one origin.
- [ ] Set `MONGO_URI`, a strong unique `JWT_SECRET`, and a separate strong `CRON_SECRET` in private Vercel environment settings. Never put secret values in Git or chat.
- [ ] Leave `VITE_API_URL` unset for production; the production client uses same-origin `/api`.
- [ ] Configure a trusted external scheduler to call `GET /api/internal/no-show` every minute with `Authorization: Bearer <CRON_SECRET>`. Vercel Hobby Cron is daily-only and cannot meet the no-show timing rule.
- [ ] Confirm `/api/health` reports database readiness. Vercel disables Socket.IO; verify Dashboard and My Orders update via the 30-second polling fallback.
- [ ] Test the app with student, staff, and admin roles, including two canteens, order lifecycle, pickup verification, counter payment, report totals, and password reset.
- [ ] Verify backups can be restored to a separate database before relying on them. Check the current Atlas plan's backup/export capabilities.
- [ ] Review the [security route audit](./SECURITY-ROUTE-AUDIT.md), complete package-based hardening, and resolve all CI failures.
- [ ] Confirm the app has a support contact, staff training, and a manual ordering fallback.

## Release and rollback

1. Deploy from a reviewed commit on `multi-canteen`; do not merge to `main` without explicit approval.
2. Record the commit SHA, deployment time, and operator.
3. Run read-only health and smoke checks, then a small test order if using a designated test canteen/database.
4. If a serious issue appears, disable ordering at the canteen/hosting level and use the existing counter process.
5. Redeploy the last known-good commit using the provider dashboard. Do not roll back by deleting production data or resetting Git history.
6. If a schema/data change caused the issue, restore a verified backup to a separate database first, inspect it, and only then plan a controlled recovery.
7. Record the incident, affected orders, and follow-up fixes before re-enabling orders.

This checklist is a preparation aid, not confirmation that the current project is production-ready or deployed.
