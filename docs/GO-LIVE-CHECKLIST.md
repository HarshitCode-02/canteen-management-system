# Production readiness and rollback checklist

## Before deploying

- [ ] Create a separate production MongoDB database; do not point production at local/test data.
- [ ] Restrict Atlas network access to the hosting provider's documented outbound addresses where possible; use a least-privilege database user.
- [ ] Create the Render Blueprint from the reviewed `multi-canteen` branch; the one service serves the frontend, API, and Socket.IO from one origin.
- [ ] Set `MONGO_URI` and a strong unique `JWT_SECRET` only in Render's private environment settings. The blueprint sets `NODE_ENV=production`; Render supplies `RENDER_EXTERNAL_URL`.
- [ ] Leave `VITE_API_URL` unset for same-origin requests. `vercel.json` is legacy config and is not part of this deployment.
- [ ] Confirm the Render health check waits for MongoDB readiness and Socket.IO works through the deployed proxy.
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
