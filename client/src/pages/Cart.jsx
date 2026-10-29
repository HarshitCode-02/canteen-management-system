import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { errorMessage } from "../api";
import { useCart } from "../context/CartContext";

const PICKUP_OPTIONS = [15, 30, 45, 60, 90]; // minutes from now

export default function Cart() {
  const { items, canteen, addItem, decrease, remove, clearCart, total } = useCart();
  const navigate = useNavigate();
  const [minutes, setMinutes] = useState(30);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const canteenId = canteen?._id;

  // check whether the canteen is still open
  useEffect(() => {
    if (!canteenId) return;
    api
      .get(`/canteens/${canteenId}`)
      .then((res) => setIsOpen(res.data.isOpen))
      .catch(() => {});
  }, [canteenId]);

  const placeOrder = async () => {
    if (!isOpen) return;
    setError("");
    setBusy(true);
    try {
      const pickupTime = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      await api.post("/orders", {
        items: items.map((i) => ({ menuItemId: i.menuItemId, qty: i.qty })),
        pickupTime,
      });
      clearCart();
      navigate("/orders");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="card">
        <h2>Your cart is empty</h2>
        <Link to="/">Choose a canteen</Link>
      </div>
    );
  }

  return (
    <div className="card wide">
      <h2>Your cart</h2>
      {canteen && (
        <p className="muted">
          Ordering from <b>{canteen.name}</b> ·{" "}
          <Link to={`/canteen/${canteen._id}`}>Add more items</Link>
        </p>
      )}

      {items.map((i) => (
        <div key={i.menuItemId} className="cart-row">
          <div>
            <b>{i.name}</b>
            <p className="muted">₹{i.price} each</p>
          </div>
          <div className="stepper">
            <button className="small" onClick={() => decrease(i.menuItemId)}>−</button>
            <b>{i.qty}</b>
            <button className="small" onClick={() => addItem({ _id: i.menuItemId, ...i })}>+</button>
          </div>
          <b>₹{i.price * i.qty}</b>
          <button className="small danger" onClick={() => remove(i.menuItemId)}>✕</button>
        </div>
      ))}

      <div className="cart-total">
        <span>Total</span>
        <b>₹{total}</b>
      </div>

      <label className="field">
        I'll pick it up in
        <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
          {PICKUP_OPTIONS.map((m) => (
            <option key={m} value={m}>{m} minutes</option>
          ))}
        </select>
      </label>

      {!isOpen && <p className="error">This canteen is closed right now. You can't place an order.</p>}
      {error && <p className="error">{error}</p>}
      <p className="muted">You pay at the counter when you collect.</p>
      <button onClick={placeOrder} disabled={busy || !isOpen}>
        {busy ? "Placing order..." : "Place order"}
      </button>
    </div>
  );
}