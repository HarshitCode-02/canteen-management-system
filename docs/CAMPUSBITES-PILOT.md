# CampusBites one-lunch pilot plan

## Before pilot day

- Enter the real menu manually through **Manage Menu** after confirming names, prices, and availability with CampusBites. Do not run `server/seed.js` against the real canteen: it replaces the sample menu items for its seeded canteens.
- Confirm the canteen is active/open, pickup slots are sensible, staff accounts are scoped to CampusBites, and staff can use the dashboard on the device they will have at the counter.
- Make sure the deployment is HTTPS, backups/restore have been rehearsed, and the admin knows how to disable ordering if service must pause.
- Train staff with [the quick guide](./STAFF-QUICK-GUIDE.md) and walk through a test order using a test environment.
- Tell pilot participants this is pre-order pickup, not delivery, and payment is made at the counter.

## Pilot lunch

1. Start with a small, invited group and a limited menu.
2. Have one staff member watch the dashboard while another handles food and counter payment.
3. Keep the existing walk-up ordering process available as a fallback.
4. Check new orders, status changes, pickup codes, and payment status during service.
5. Pause online ordering if staff cannot keep up, prices are wrong, or orders are not reaching the dashboard.
6. At the end, reconcile collected orders and counter payments before reviewing the report.

## Feedback collection

Use a paper form or an approved college feedback channel. Do not collect passwords, tokens, payment credentials, or unnecessary personal data. Suggested questions:

- Was the menu and pickup time clear?
- Did the order appear at the counter promptly?
- Was the pickup code easy to find and verify?
- How long did ordering and pickup take?
- What was confusing or failed? Include approximate time/order number, not account credentials.
- Would you use pre-order pickup again? What should change first?

Record issues in the bug template in [the phone test plan](./PHONE-TEST-PLAN.md). Review feedback with staff before expanding to more canteens.

## Pilot success measures

Review an initial two-week pilot, then decide whether to extend it. Use aggregate daily totals and avoid public student identities:

- Registered participants and distinct users who place an order.
- Orders placed, collected, cancelled, and no-show; define completion as collected orders divided by placed orders, excluding cancellations only when explicitly stated.
- Repeat-order rate among participants with at least one prior completed order.
- Checkout median and p95 response time, correlated using request IDs. Separate database wait, transaction time, and platform/cold-start delay.
- Ready-status notification refresh/delivery observations and common checkout error categories.
- Popular items and canteen workload, reviewed with staff and without exporting personal account details.

Compare app metrics with staff observations and counter reconciliation. Do not treat registered accounts alone as adoption, or paid revenue as all orders; sales revenue should count only orders with `paymentStatus: paid`.
