# Production handover and rollback checklist

The owner reports the product is deployed on Vercel. Use this checklist to verify the live configuration and handover; do not treat deployment itself as independently confirmed by this document.

- [ ] Confirm the active Vercel project root. For the client project setup, verify `client/vercel.json` forwards `/api/*` to the live backend; do not change the root or rewrite during handover.
- [ ] Leave `VITE_API_URL` unset when using the same-origin proxy; if direct cross-origin API access is intentional, verify cookie/CORS behavior. Confirm `CLIENT_URL` allows the deployed client origin. Never put values in Git or chat.
- [ ] Confirm the Vercel server has private `MONGO_URI`, `JWT_SECRET`, and `CRON_SECRET` settings; do not print or share their values.
- [ ] Restrict Atlas access, use a least-privilege database user, and confirm backup/restore access.
- [ ] Check `/api/health` and test cookie login/refresh with separate student, staff, and admin accounts.
- [ ] Place a designated test order; verify status transitions, pickup-code verification, counter payment, order history, and staff ownership restrictions.
- [ ] Confirm Dashboard/My Orders update using the deployed polling behavior; the Vercel build disables Socket.IO.
- [ ] Confirm an external trusted scheduler calls `GET /api/internal/no-show` every minute with the configured bearer secret. Vercel Hobby Cron is daily-only; do not rely on it for this interval.
- [ ] Test the app with student, staff, and admin roles, including two canteens, order lifecycle, pickup verification, counter payment, report totals, and password reset.
- [ ] Verify the actual backup can be restored to a separate database; check the Atlas plan's backup/export capability.
- [ ] Review the [security route audit](./SECURITY-ROUTE-AUDIT.md) and confirm GitHub Actions is green for the handoff commit.
- [ ] Confirm staff training, a support contact, and a manual ordering fallback.

## Release and rollback

1. Keep `main` as the deployed product branch. Develop on a feature branch; merge only a reviewed, tested change with approval.
2. Record the commit SHA, deployment time, and operator.
3. Run read-only health and smoke checks, then a small test order if using a designated test canteen/database.
4. If a serious issue appears, disable ordering at the canteen/hosting level and use the existing counter process.
5. Redeploy the last known-good commit using the provider dashboard. Do not roll back by deleting production data or resetting Git history.
6. If a schema/data change caused the issue, restore a verified backup to a separate database first, inspect it, and only then plan a controlled recovery.
7. Record the incident, affected orders, and follow-up fixes before re-enabling orders.

This checklist is a handover aid, not confirmation that each live verification has been completed.
