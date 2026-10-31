import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { errorMessage } from "../api";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count, clearCart } = useCart();
  const [logoutError, setLogoutError] = useState("");
  const isStaff = user.role === "canteen" || user.role === "admin";

  const handleLogout = async () => {
    clearCart();
    setLogoutError("");
    try {
      await logout();
    } catch (err) {
      setLogoutError(errorMessage(err));
    }
  };

  return (
    <nav className="navbar">
      <Link to="/" className="brand">Canteen</Link>
      <div className="nav-right">
        {logoutError && <span className="error" role="alert">{logoutError}</span>}
        {isStaff && <Link to="/dashboard">Dashboard</Link>}
        {user.role === "admin" && <Link to="/admin">Admin</Link>}
        {user.role === "admin" && <Link to="/admin/reviews">Review moderation</Link>}
        {user.role === "admin" && <Link to="/admin/audit-logs">Audit log</Link>}
        {isStaff && <Link to="/manage-menu">Manage Menu</Link>}
        {isStaff && <Link to="/blocked">Blocked</Link>}
        {isStaff && <Link to="/report">Sales Report</Link>}
        <Link to="/orders">My Orders</Link>
        {["student", "teacher"].includes(user.role) && <Link to="/discover">Discover</Link>}
        <Link to="/account">Account</Link>
        <Link to="/cart">Cart ({count})</Link>
        <span className="nav-user">{user.name}</span>
        <button className="small" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}