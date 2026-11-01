# CampusBites website tutorial

This guide explains what each account can do and how to use the website. Use the CampusBites link provided by your college or canteen administrator. The site requires an internet connection for menus, orders, payment recording, and account actions.

## What CampusBites does

CampusBites lets students and teachers order food from a campus canteen before arriving, choose a pickup time, and collect at the counter. Canteen teams manage their own menus and orders; the administrator manages canteens, accounts, reviews, and reports.

- One cart and order use items from one canteen.
- The server checks availability and calculates prices when an order is placed.
- There is no delivery, online checkout, or payment gateway. Pay cash or UPI at the canteen counter.
- Order status and payment status are separate. A collected order can still show payment due until staff record the counter payment.
- The website is not an allergy or nutrition guide. Menu allergen information is not maintained.

## Pick the right account

| Account | How it is created | Main pages |
|---|---|---|
| Visitor | No account yet | Login and student registration |
| Student | Register on the site; the account is created as a student | Canteens, menu, cart, orders, account, Discover |
| Teacher | Provisioned by the administrator | Canteens, menu, cart, orders, account, Discover |
| Canteen owner or staff | Created and assigned to a canteen by the administrator | Dashboard, Manage Menu, Blocked, Sales Report |
| Administrator | Privileged account provisioned by the project administrator | Admin tools plus staff pages |

You must sign in to browse the canteens and use the app. A new public registration cannot select a teacher, canteen, or administrator role. A canteen owner uses the canteen staff account for that canteen.

## First visit and sign-in

1. Open the website URL supplied by your college/canteen administrator.
2. If you are a student without an account, choose **Create an account** and enter your name, email, phone, and password. Sign in after registration.
3. Teachers, canteen staff/owners, and administrators must use an account provisioned for their role; contact the administrator if you do not have one.
4. Choose **Login**, enter your account email and password, and submit.
5. Use **Logout** when finished on a shared device. Do not share your password or leave an authenticated session open.
6. If you forget your password, use **Forgot password?** on Login and contact the app administrator. There is no automatic reset email/SMS; the administrator must verify your identity and give you a temporary password securely. Change it after signing in.

The login is an HttpOnly-cookie session. Do not look for or copy a token from browser storage. If the site says your session is missing, sign in again using the correct website address and ask the administrator to check the deployment if it continues.

## Help, contact, and install options

The shared page footer links to ordering and pickup instructions, FAQs, payment information, contact support, privacy, and terms. Use the support email shown there for account or order questions; include an order number when relevant, but never send passwords, pickup codes, cookies, or payment credentials.

On supported browsers, choose **Install CampusBites** to use the browser's install prompt. On iPhone or iPad, open the site in Safari, use **Share**, then choose **Add to Home Screen**. Availability depends on browser and device; installing is optional.

## Student and teacher: browse, order, and collect

### Find food and place an order

1. Sign in. The home page shows active canteens, their open/closed state, and optional canteen images. If an image is unavailable, the card displays the CampusBites fallback.
2. Open a canteen to see its menu, prices, availability, categories, and any visible review ratings.
3. Add items to your cart. The cart holds items for one canteen at a time; switching canteens may replace the existing cart.
4. Open **Cart**, check quantities and the total, select an available pickup time, and optionally add a short note.
5. Submit the order. The server rechecks current menu prices, availability, canteen status, quantity limits, and pickup-slot capacity. You can have only one active order at a time.
6. Open **My Orders** to see your order number and status. You can cancel only while an order is still **placed**.

### Follow the order and pick it up

Orders move through **placed → preparing → ready → collected**. Staff may cancel eligible orders, and a ready order may become a no-show if it is not collected.

1. When your order is **ready**, go to the selected canteen.
2. Show the QR displayed for the ready order, or give staff the four-digit pickup code. The QR is short-lived and only works while the order remains ready. Camera scanning requires a supported HTTPS browser; the code is the fallback.
3. Pay the order total by cash or UPI at the counter. Payment is not taken by the website.
4. Staff mark the order collected and record whether payment was received. If payment was not recorded at pickup, staff can record it later.
5. On a ready order, **I'm running late (+10 min)** may be used once. Contact the canteen promptly; do not assume the order will stay ready indefinitely.
6. A no-show blocks new ordering. Pay the full no-show order amount at the counter; staff must record all unpaid no-show payments before the account can be unblocked.

### Reorder, review, and Discover

- **Reorder** starts a new cart using items that are still available at the same canteen. Check the current prices before submitting.
- After an order is collected, submit one rating/review for each eligible item from **My Orders**. Reviews are tied to the collected order; administrators can hide or restore a review.
- **Discover → Meals within your budget:** enter a rupee budget and a maximum of 1–4 items. Suggestions use currently available items at active, open canteens; they are not allergy, nutrition, or dietary advice.
- **Discover → Compare canteens:** select up to three canteens. Price rows match exact item names and categories; a similar-sounding dish is not necessarily the same recipe or portion.
- **Discover → Canteen assistant:** ask about current menu items, canteens, popular items, a budget suggestion, or your own active order. It is a deterministic helper, not a human and not an external AI service.
- **Notifications** can alert you when an order is ready if your browser supports notifications and you grant permission.

## Canteen owner and staff: run service

The owner/staff account can manage only canteens assigned by the administrator.

### Start of service

1. Sign in and open **Dashboard**.
2. If the account manages more than one canteen, select the correct canteen before changing its menu or orders.
3. Check that the canteen is open and that menu availability and prices are current.
4. Press **Enable sound** once if you want an audible alert for new orders. Keep the dashboard open; on Vercel it refreshes in the background by polling.

### Prepare and hand over orders

1. For a new **placed** order, check the items, quantities, pickup time, and note; press **Start preparing** when work begins.
2. Press **Mark ready** only when the order is ready at the counter.
3. When the customer arrives, use **Start QR scanner** and allow camera access if the browser/device supports it, or enter the four-digit code on the order card.
4. Verify the order belongs to your selected canteen. Hand over the food only after the server confirms collection.
5. Mark **Payment received** only after cash or UPI has actually been received. If payment is outstanding, leave it unchecked and use **Confirm payment** after collecting the money.
6. If an order is not collected, use **No-show** only when appropriate. The first recorded no-show blocks the student's account.

### Menu, blocked accounts, and reports

- **Manage Menu:** add a menu item with its name, category, price, preparation estimate, and optional image URL; update prices; mark items sold out/available; mark a special; or delete an item. Menu edits affect new orders, not the saved item/price snapshot on an existing order.
- **Blocked:** review no-show orders at your canteen. Record payment only after receiving the amount at the counter. Unblocking is permitted only after every unpaid no-show order for that person is recorded as paid.
- **Sales Report:** review order totals, payment totals, no-shows, best-selling items, and pickup-time activity. This is an operational report, not a payment processor or online accounting ledger.
- If an order is missing, confirm the selected canteen and refresh. Do not ask customers to send passwords, tokens, or pickup QR screenshots through chat.

### QR scanning troubleshooting

- The camera starts only after you press **Start QR scanner**.
- Camera scanning needs HTTPS, browser camera permission, and a working camera.
- If permission is denied, the camera is unavailable, or the page is not in a secure context, enter the four-digit pickup code instead.
- If a QR is expired, invalid, already used, or belongs to a different canteen, check the order and ask the customer to show the current ready-order screen. Never bypass server verification.

## Administrator: manage the service

Administrator access is for the designated project/college administrator.

1. Sign in with the provisioned administrator account; public registration cannot create an administrator.
2. Open **Admin** to create and edit canteens, set availability, create canteen accounts, assign canteens, review blocked student/teacher accounts, and manage password resets.
   - A canteen can have an optional administrator-managed logo URL. Use a publicly reachable image URL (HTTPS recommended); image upload is not provided. Clear the URL to use the default CampusBites card image.
3. Create the canteen record first, then create its owner/staff login and assign the correct canteen. Share the temporary sign-in details privately and ask the owner to change their password.
4. Use **Review moderation** to inspect reviews and hide or restore them. Hidden reviews do not contribute to public ratings.
5. Use **Audit log** to filter and review recorded order, payment, menu, canteen, staff-account, no-show block/unblock, password-reset, and review-moderation actions. The log is not a payment ledger.
6. Use **Dashboard**, **Manage Menu**, **Blocked**, and **Sales Report** for canteen operations; verify the selected canteen before a staff-style change.

The administrator should provision or remove accounts carefully, avoid sharing staff credentials between people, confirm cash/UPI receipt before recording payment, and protect the admin account with a unique password.

## Privacy, reliability, and offline behavior

- Do not share another user's phone number, order details, pickup code, QR image, or review outside the people who need it to fulfil the order.
- QR pickup is a convenience; the four-digit code remains an alternate pickup method. Staff still need to verify the server response.
- The website can show an offline message and cache static files, but it does not cache private order/account information or submit/queue orders offline. Reconnect before placing an order or changing account/order data.
- On the Vercel deployment, the interface uses polling rather than persistent Socket.IO updates. Refresh if an update appears delayed.
- If the app shows an authorization or network error, check the internet connection, sign in again, and contact the administrator with the approximate time and page. Messages are designed to avoid showing internal server details. Do not send passwords, cookies, or tokens.

## Quick role checklist

- **Student/teacher:** sign in → choose canteen → add food → choose pickup time → place one active order → collect using QR/code → pay at counter → optionally review.
- **Canteen owner/staff:** sign in → choose assigned canteen → manage menu/open state → prepare order → mark ready → verify pickup → record actual payment → review no-shows/reports.
- **Administrator:** create canteens → create/assign staff → review blocked accounts → moderate reviews → inspect audit log → support account recovery and handover.
