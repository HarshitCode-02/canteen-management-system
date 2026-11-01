import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import usePwaInstall from "../context/usePwaInstall";

const SUPPORT_EMAIL = "campusbites034@gmail.com";
const contactHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("CampusBites Support Request")}`;

const QUICK_LINKS = [
  { label: "Home", to: "/" },
  { label: "Discover meals", to: "/discover" },
  { label: "Canteens", to: "/canteens" },
  { label: "My orders", to: "/orders" },
  { label: "Cart", to: "/cart" },
  { label: "Canteen Assistant", to: "/discover#canteen-assistant" },
];

const SUPPORT_LINKS = [
  { label: "How to order", to: "/help/how-to-order" },
  { label: "Pickup instructions", to: "/help/pickup" },
  { label: "Frequently asked questions", to: "/help/faq" },
  { label: "Payment information", to: "/payment-info" },
  { label: "Contact support", to: contactHref, external: true },
];

function FooterLinks({ links, label }) {
  return (
    <nav className="footer-link-section" aria-label={label}>
      <h2>{label}</h2>
      <ul>
        {links.map((link) => (
          <li key={link.label}>
            {link.external ? (
              <a className="footer-link" href={link.to}>{link.label}</a>
            ) : (
              <NavLink
                className={({ isActive }) => `footer-link${isActive ? " is-active" : ""}`}
                to={link.to}
                end={link.to === "/"}
              >
                {link.label}
              </NavLink>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

function InstallApp() {
  const { canInstall, installed, isIos, installing, install } = usePwaInstall();
  const [error, setError] = useState("");

  if (installed || (!canInstall && !isIos)) return null;

  const handleInstall = async () => {
    setError("");
    try {
      await install();
    } catch {
      setError("Installation could not be started. Try your browser's install option.");
    }
  };

  return (
    <section className="footer-install" aria-labelledby="footer-install-title">
      <div>
        <h2 id="footer-install-title">Use CampusBites like an app</h2>
        {canInstall ? (
          <p>Add CampusBites to your home screen for quick access to campus food ordering.</p>
        ) : (
          <p>On iPhone or iPad, open CampusBites in Safari, tap Share, then choose “Add to Home Screen.”</p>
        )}
        {error && <p className="footer-install-error" role="alert">{error}</p>}
      </div>
      {canInstall && (
        <button type="button" className="footer-install-button" onClick={handleInstall} disabled={installing}>
          {installing ? "Opening install prompt..." : "Install CampusBites"}
        </button>
      )}
    </section>
  );
}

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-grid">
          <section className="footer-brand" aria-labelledby="footer-brand-title">
            <Link to="/" className="footer-brand-link">
              <img src="/pwa-icon.svg" alt="" width="42" height="42" />
              <span id="footer-brand-title">CampusBites</span>
            </Link>
            <p>Your campus, your cravings, one platform. Discover meals, order from campus canteens, and enjoy a more convenient dining experience.</p>
            <span className="footer-tagline">Made for campus life.</span>
          </section>

          <FooterLinks links={QUICK_LINKS} label="Quick links" />
          <FooterLinks links={SUPPORT_LINKS} label="Student support" />

          <section className="footer-contact" aria-labelledby="footer-contact-title">
            <h2 id="footer-contact-title">Contact Us</h2>
            <p>Have a question or need help with CampusBites? We'd love to hear from you.</p>
            <a className="footer-email" href={contactHref}>
              <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
                <path d="M3 5h18v14H3zM3 6l9 7 9-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
              <span>{SUPPORT_EMAIL}</span>
            </a>
            <a className="footer-contact-button" href={contactHref}>Contact Support</a>
          </section>
        </div>

        <InstallApp />

        <div className="footer-bottom">
          <nav className="footer-legal-links" aria-label="Legal and payment information">
            <NavLink className={({ isActive }) => `footer-link${isActive ? " is-active" : ""}`} to="/privacy">Privacy Policy</NavLink>
            <NavLink className={({ isActive }) => `footer-link${isActive ? " is-active" : ""}`} to="/terms">Terms of Use</NavLink>
            <NavLink className={({ isActive }) => `footer-link${isActive ? " is-active" : ""}`} to="/payment-info">Payment Information</NavLink>
          </nav>
          <p className="footer-copyright">© {new Date().getFullYear()} CampusBites. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
