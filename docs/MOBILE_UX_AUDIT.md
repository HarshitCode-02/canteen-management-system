# CampusBites mobile UX audit

**Audit date:** 2026-10-31  
**Validation:** Source/CSS inspection and production build. Visual viewport validation was attempted but local Vite could not bind a port (`EPERM`), so no visual test is claimed.

## Changes in this phase

- Navbar keeps the brand, cart icon/count, signed-in name, and hamburger. At 360px and below, the name text becomes initials with an accessible signed-in name. Role-appropriate links and Logout remain in the menu.
- Menu navigation buttons have touch-friendly minimum sizes.
- Cart rows become a two-row layout on small screens; quantity and remove controls are at least 44px tall.
- Checkout waits for canteen-open and slot checks, reports fetch errors, disables duplicate taps, displays progress, and gives a server-confirmed order summary.
- Order status notices appear in the app, refresh every 30 seconds, and refresh on focus, visibility restoration, and socket reconnection. Browser alerts are opt-in and not requested on page load.

## Existing responsive behavior and remaining checks

- Menu/canteen grids use responsive `minmax(220px, 1fr)` columns; menu images use `object-fit: cover`.
- The React app does not have a configured component/browser test script. No automated horizontal-overflow assertion is present.
- Manually test 320, 360, 375, 390, 414, and 430px; then tablet/desktop. Check long names, menu search, staff tables, modals, sticky navigation, cart rows, keyboard focus, and on-screen keyboard behavior.
- The account-name display and initials currently derive from the authenticated user name, falling back to the email local part when needed.
- A browser notification is only generated after permission is explicitly granted and the site is running. This app does not deliver push notifications after the site/browser is closed.
