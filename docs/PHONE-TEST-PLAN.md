# Phone and workflow test plan

Run this against a test environment and test database, not production orders. Use one student, one canteen staff account for each of two canteens, and one admin account. Never include passwords, tokens, or database connection strings in bug reports.

## Setup

- Prepare two active canteens with separate menus and separate staff ownership.
- Add one sold-out item and one available item to each canteen.
- Use a phone browser at approximately 360 px wide; use desktop browsers for staff/admin setup if easier.
- Confirm each account is assigned the intended role and canteen.
- Test counter payment only. There is no online payment feature.

## Student checks

1. Register/login; verify a student cannot access `/dashboard`, `/manage-menu`, `/blocked`, `/report`, or `/admin`.
2. Browse both canteens and confirm each menu is scoped to its canteen.
3. Add items from one canteen, then choose another; confirm the cart-switch prompt prevents a mixed-canteen cart.
4. Try sold-out items, an empty cart, and a valid order with a pickup time; confirm server errors are clear and successful orders show correct totals.
5. While an order is active, try placing another order; confirm it is rejected.
6. Confirm only the owner sees the pickup code; refresh the page and check the order remains.
7. Cancel a placed order; verify cancellation is unavailable once preparation starts.
8. Reorder a completed order and verify it uses current menu availability/prices.
9. Change the password; confirm the new password works and old sessions/tokens are rejected.

## Staff checks

1. Log in as canteen A staff and confirm the dashboard, menu editor, blocked list, and report contain only canteen A data.
2. Try requesting canteen B IDs in staff endpoints; expect a 403 and no data change.
3. Add/edit/mark sold out a menu item; verify the student menu updates.
4. Walk an order through placed → preparing → ready → collected using the student's pickup code.
5. Try a wrong pickup code repeatedly; verify collection is rejected and rate-limited at the configured attempt limit.
6. Record payment at the counter or leave it pending and confirm payment later; collected orders do not automatically mean paid.
7. Confirm a ready order becomes a no-show only after the configured wait; test the student is blocked immediately after the first no-show.
8. Open the sales report for Today, 7 days, and 30 days; compare totals, unpaid amount, best sellers, and IST pickup-hour bars to test orders.

## Admin checks

1. Open the admin overview and verify all canteens, owners, and blocked students/teachers are listed without password hashes.
2. Edit a canteen name, location, description, logo URL, slot limit, and preparation estimate.
3. Disable a canteen and verify it disappears from the public list; re-enable it and verify it returns.
4. Reset a canteen owner's password, deliver the temporary password privately, and verify existing sessions are invalidated.
5. Try to unblock before recording payment and confirm it is prevented. Record the full no-show order amount as paid after receiving it at the counter, unblock the student, and confirm the no-show count resets.
6. Confirm non-admin accounts cannot access admin API routes even when they know the URL.

## Bug report template

- Device/browser and viewport width:
- Account role and test canteen (never include credentials):
- Steps to reproduce:
- Expected result:
- Actual result:
- Screenshot with names/phone numbers/tokens removed:
- Does it happen every time?:
