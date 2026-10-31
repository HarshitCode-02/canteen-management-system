# CampusBites Phase 2 Deployment Notes

## Current deployment assumptions

- The owner reports the product is deployed on Vercel. This repository cannot independently verify production settings.
- The client project uses `client/vercel.json` to proxy `/api/*` to the backend deployment. Keep its destination synchronized with the current API host.
- The root `vercel.json` describes Vercel multi-service routing. Confirm the active Vercel project root before changing either config.
- The backend requires private `MONGO_URI` and `JWT_SECRET`; it also uses `CLIENT_URL` and `CRON_SECRET` as applicable. Never place values in source or documentation.
- Vercel disables the persistent Socket.IO client. Dashboard and My Orders poll every 30 seconds.
- The Vercel serverless runtime cannot keep `node-cron` alive. A trusted external scheduler must call the protected no-show endpoint at its configured interval.

## Phase 2 rollout requirements

No phase-2 feature should be deployed automatically by GitHub Actions. Review the feature branch and deployment preview first.

Before enabling features against production:

1. Confirm Vercel client/API routing and private environment-variable names in the dashboard.
2. Apply only additive MongoDB indexes/schema changes. Do not delete or rewrite existing data.
3. New additive data includes QR token hash/expiry and actor timestamps on orders, the `Review` collection with a unique user/order/item index, and the append-only `AuditLog` collection with query indexes. Existing orders/users remain valid without the new optional fields.
4. Test migration/index behavior on a disposable database or a verified backup copy; resolve any duplicate review data before index creation if the feature has already been used.
5. Confirm collection remains atomic and payment remains an independent staff action.
6. Confirm the service worker does not cache `/api/` or Socket.IO responses, cookies, order records, or administrative data, and verify offline messaging on devices.
7. Verify camera permission and QR scan over HTTPS on supported mobile browsers; retain manual pickup-code fallback.
8. Confirm audit endpoints are admin-only and audit metadata excludes passwords, cookies, pickup codes, QR tokens, and free-form review text.
9. Run the tests and builds recorded in `PHASE_2_TEST_REPORT.md`.
10. Keep a known-good deployment/commit available for rollback and verify data restoration procedures separately.

## Device and integration verification

Automated/local checks do not replace:

- Testing camera permission and scanner cleanup on an HTTPS Android browser and iOS Safari.
- Testing install prompts and offline behavior on actual devices.
- Running transaction and index checks against a disposable replica-set-capable MongoDB.
- Verifying Vercel environment configuration, external scheduler operation, and Atlas backup/restore.

Do not use production customer data or the production database for feature tests.
