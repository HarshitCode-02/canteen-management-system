import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { errorMessage } from "../api";
import { useCart } from "../context/CartContext";

const fmtSlot = (iso) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

export default function Cart() {
  const { items, canteen, addItem, decrease, remove, clearCart, total } = useCart();
  const navigate = useNavigate();
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState(""); // ISO start time of the chosen slot
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
      .catch(() => { });
  }, [canteenId]);

  // load the pickup slots; keep the chosen slot if it is still free, else pick the first free one
  const loadSlots = useCallback(() => {
    if (!canteenId) return;
    api
      .get(`/canteens/${canteenId}/slots`)
      .then((res) => {
        setSlots(res.data);
        setSlot((cur) => {
          if (res.data.find((s) => s.start === cur && !s.full)) return cur;
          const firstFree = res.data.find((s) => !s.full);
          return firstFree ? firstFree.start : "";
        });
      })
      .catch(() => { });
  }, [canteenId]);

  // refresh every minute so past slots drop off
  useEffect(() => {
    loadSlots();
    const timer = setInterval(loadSlots, 60000);
    return () => clearInterval(timer);
  }, [loadSlots]);

  const placeOrder = async () => {
    if (!isOpen || !slot) return;
    setError("");
    setBusy(true);
    try {
      await api.post("/orders", {
        items: items.map((i) => ({ menuItemId: i.menuItemId, qty: i.qty })),
        pickupTime: slot,
      });
      clearCart();
      navigate("/orders");
    } catch (err) {
      setError(errorMessage(err));
      loadSlots(); // a slot may have just filled up
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
        Pickup time
        <select value={slot} onChange={(e) => setSlot(e.target.value)}>
          {slots.map((s) => (
            <option key={s.start} value={s.start} disabled={s.full}>
              {fmtSlot(s.start)} {s.full ? "- Full" : `(${s.used}/${s.limit})`}
            </option>
          ))}
        </select>
      </label>

      {slots.length > 0 && slots.every((s) => s.full) && (
        <p className="error">All upcoming slots are full. Try again in a few minutes.</p>
      )}
      {!isOpen && <p className="error">This canteen is closed right now. You can't place an order.</p>}
      {error && <p className="error">{error}</p>}
      <p className="muted">You pay at the counter when you collect.</p>
      <button onClick={placeOrder} disabled={busy || !isOpen || !slot}>
        {busy ? "Placing order..." : "Place order"}
      </button>
    </div>
  );
}