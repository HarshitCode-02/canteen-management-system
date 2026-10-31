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
        <Link to="/cart" className="nav-cart">Cart ({count})</Link>
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