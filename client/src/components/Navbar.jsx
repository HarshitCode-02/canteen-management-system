import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { errorMessage } from "../api";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count, clearCart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const menuRef = useRef(null);
  const isStaff = user.role === "canteen" || user.role === "admin";
  const displayName = user.name?.trim() || user.email?.split("@")[0] || "Account";

  useEffect(() => {
    if (!menuOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const closeOnOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setLogoutError("");
    try {
      await logout();
      clearCart();
      setMenuOpen(false);
    } catch (err) {
      setLogoutError(errorMessage(err));
    }
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="navbar">
      <Link to="/" className="brand">Canteen</Link>
      <div className="nav-actions">
        <Link to="/cart" className="nav-cart" aria-label={`Cart, ${count} items`}>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
            <path d="M3 4h2l2.2 11.1a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 1.9-1.4L22 8H6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="10" cy="21" r="1" />
            <circle cx="18" cy="21" r="1" />
          </svg>
          <span>{count}</span>
        </Link>
        <Link to="/search" className="nav-search" aria-label="Search CampusBites" title="Search">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="21" height="21">
            <circle cx="10.8" cy="10.8" r="6.8" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="m16 16 4.5 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>Search</span>
        </Link>
        <Link
          to="/account"
          className="nav-user"
          aria-label={`Account profile: ${displayName}`}
          title={displayName}
        >
          {displayName}
        </Link>
        <div className="nav-menu" ref={menuRef}>
          <button
            type="button"
            className="nav-toggle"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
          {menuOpen && (
            <div className="nav-dropdown" id="primary-navigation">
              {logoutError && <span className="error" role="alert">{logoutError}</span>}
              {isStaff && <Link to="/dashboard" onClick={closeMenu}>Dashboard</Link>}
              {user.role === "admin" && <Link to="/admin" onClick={closeMenu}>Admin</Link>}
              {user.role === "admin" && <Link to="/admin/reviews" onClick={closeMenu}>Review moderation</Link>}
              {user.role === "admin" && <Link to="/admin/audit-logs" onClick={closeMenu}>Audit log</Link>}
              {isStaff && <Link to="/manage-menu" onClick={closeMenu}>Manage Menu</Link>}
              {isStaff && <Link to="/blocked" onClick={closeMenu}>Blocked</Link>}
              {isStaff && <Link to="/report" onClick={closeMenu}>Sales Report</Link>}
              <Link to="/orders" onClick={closeMenu}>My Orders</Link>
              {["student", "teacher"].includes(user.role) && <Link to="/discover" onClick={closeMenu}>Discover</Link>}
              <Link to="/account" onClick={closeMenu}>Account</Link>
              <button type="button" className="nav-logout" onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}