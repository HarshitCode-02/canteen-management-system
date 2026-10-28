import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count, clearCart } = useCart();

  const handleLogout = () => {
    clearCart();
    logout();
  };

  return (
    <nav className="navbar">
      <Link to="/" className="brand">Canteen</Link>
      <div className="nav-right">
        <Link to="/cart">Cart ({count})</Link>
        <span className="nav-user">{user.name}</span>
        <button className="small" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}