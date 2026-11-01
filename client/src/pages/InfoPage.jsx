import { Link, Navigate, useLocation } from "react-router-dom";

const PAGES = {
  "/help/how-to-order": {
    title: "How to order",
    intro: "Place an order ahead and collect it from the canteen you choose.",
    content: (
      <ol>
        <li>Sign in, open Home, and choose a canteen. Check that it is open and that the items you want are available.</li>
        <li>Add items to your cart, review quantities and the total, then choose an available pickup time.</li>
        <li>Add an optional note for the canteen, then select <b>Place order</b>. Keep the page open until your order is confirmed.</li>
        <li>Follow progress in <Link to="/orders">My Orders</Link>. When the status is ready, go to the canteen counter to collect and pay.</li>
      </ol>
    ),
  },
  "/help/pickup": {
    title: "Pickup instructions",
    intro: "Use your order status and pickup details to collect from the correct canteen counter.",
    content: (
      <ol>
        <li>Open <Link to="/orders">My Orders</Link> and wait until the order says <b>Ready for pickup</b>.</li>
        <li>Go to the canteen shown on your order around the selected pickup time.</li>
        <li>Show the pickup QR code or the four-digit fallback code displayed with the ready order to canteen staff. The QR code is time-limited; if it has expired, ask staff to verify your order using the available pickup process.</li>
        <li>Pay the order total at the counter when you collect it. Keep your pickup code private until staff verifies your order.</li>
      </ol>
    ),
  },
  "/help/faq": {
    title: "Frequently asked questions",
    intro: "Quick answers about ordering, pickup, payment, and getting help.",
    content: (
      <div className="info-faq">
        <section>
          <h2>How do I place an order?</h2>
          <p>Choose an open canteen, add available menu items to your cart, select a pickup slot, and place the order. See <Link to="/help/how-to-order">How to order</Link>.</p>
        </section>
        <section>
          <h2>How do I check my order status?</h2>
          <p>Open <Link to="/orders">My Orders</Link>. The order status updates as the canteen receives, prepares, and marks your order ready or collected.</p>
        </section>
        <section>
          <h2>How do I collect my order?</h2>
          <p>When it is marked ready, go to the canteen counter and show the pickup QR code or fallback code. Pay the total at the counter.</p>
        </section>
        <section>
          <h2>Can I cancel an order?</h2>
          <p>You can cancel your own order while its status is still <b>Order received</b> (placed). The cancel option is not available after the canteen starts preparing it.</p>
        </section>
        <section>
          <h2>What if my order is delayed?</h2>
          <p>Check its latest status in <Link to="/orders">My Orders</Link>. If you need help, ask the canteen counter or <Link to="/contact">contact CampusBites support</Link>.</p>
        </section>
        <section>
          <h2>How does payment work?</h2>
          <p>Payment is made at the canteen counter when you collect. CampusBites does not process online payments. Read <Link to="/payment-info">Payment Information</Link>.</p>
        </section>
      </div>
    ),
  },
  "/payment-info": {
    title: "Payment information",
    intro: "CampusBites currently records counter payments; it does not take payment online.",
    content: (
      <>
        <h2>Pay when you collect</h2>
        <p>Your cart and order show the amount due. Pay the canteen at its counter when collecting your ready order. Canteen staff record the payment in CampusBites.</p>
        <h2>No online payment checkout</h2>
        <p>CampusBites does not currently collect card, UPI, or other online payments. Do not send payment details through the support email.</p>
        <h2>No-show orders</h2>
        <p>If an order is marked as a no-show, the app may block further ordering until the full order amount is paid at the canteen counter and staff records that payment and unblocks the account.</p>
        <p>If an order's payment status looks incorrect, contact support at <a href="mailto:campusbites034@gmail.com?subject=CampusBites%20Payment%20Question">campusbites034@gmail.com</a> and include the order number. Do not include passwords or payment credentials.</p>
      </>
    ),
  },
  "/contact": {
    title: "Contact Us",
    intro: "Have a question or need help with CampusBites? We'd love to hear from you.",
    content: (
      <>
        <p>Email <a href="mailto:campusbites034@gmail.com?subject=CampusBites%20Support%20Request">campusbites034@gmail.com</a>.</p>
        <p>For an order question, include its order number and a short description of the issue. Do not email your password, pickup code, or payment credentials.</p>
      </>
    ),
  },
  "/privacy": {
    title: "Privacy Policy",
    intro: "This page describes the information CampusBites currently handles based on the application's implemented features.",
    content: (
      <>
        <h2>Information the app stores</h2>
        <p>Account registration requires your name, email address, phone number, and password. The password is stored as a bcrypt hash, not as plain text. Your profile may also include optional details such as roll number, department, year, or avatar URL if you add them.</p>
        <p>When you place an order, the app stores the canteen, selected item names and prices, quantities, total, pickup time, order status, payment status, and any optional note you submit.</p>
        <p>These account and order records are stored in the application's MongoDB database.</p>
        <h2>How information is used and shared</h2>
        <p>Account information is used to sign you in and associate your orders with your account. Assigned canteen staff can see active order details, including the student's name and phone number, and authorized administrators can manage orders so they can prepare, verify pickup, and record payment.</p>
        <p>The app maintains your signed-in session with an HttpOnly authentication cookie. Operational request logs record request IDs, method, path, status, and timing. Audit records capture selected administrative and order events with limited event details.</p>
        <h2>Retention and requests</h2>
        <p>The current application does not publish a data-retention schedule or provide self-service account deletion. Storage duration depends on the database and hosting configuration for the deployment. For questions or to discuss an information request, email <a href="mailto:campusbites034@gmail.com?subject=CampusBites%20Privacy%20Question">campusbites034@gmail.com</a>.</p>
        <p>This summary reflects current application behavior; the project does not define a formal legal retention policy or make regulatory-compliance claims.</p>
      </>
    ),
  },
  "/terms": {
    title: "Terms of Use",
    intro: "Use CampusBites to browse campus canteen menus, submit orders, and follow their status.",
    content: (
      <>
        <h2>Using the service</h2>
        <p>Keep your account details accurate and use your own account. Do not attempt to access another user's account or order, interfere with the service, or misuse pickup codes.</p>
        <h2>Menus and orders</h2>
        <p>Menu availability, canteen opening status, and pickup slots can change. An order is placed only after CampusBites confirms it. Check My Orders for the current status. You may cancel your own order only while its status remains placed.</p>
        <h2>Pickup and payment</h2>
        <p>Collect a ready order from its canteen and pay the displayed total at the counter. CampusBites does not currently process online payments. A no-show may result in an ordering block until counter payment is recorded and staff unblocks the account.</p>
        <h2>Questions</h2>
        <p>For help with an account or order, email <a href="mailto:campusbites034@gmail.com?subject=CampusBites%20Support%20Request">campusbites034@gmail.com</a>. These terms describe the app's current behavior and do not claim an institutional affiliation or create a refund or data-retention policy.</p>
      </>
    ),
  },
};

export default function InfoPage() {
  const location = useLocation();
  const page = PAGES[location.pathname];
  if (!page) return <Navigate to="/" replace />;

  return (
    <article className="card wide info-page">
      <p className="info-eyebrow">CampusBites · Help & information</p>
      <h1>{page.title}</h1>
      <p className="muted">{page.intro}</p>
      <div className="info-content">{page.content}</div>
      <div className="info-page-actions">
        <Link to="/">Browse canteens</Link>
        <Link to="/discover">Discover meals</Link>
      </div>
    </article>
  );
}
