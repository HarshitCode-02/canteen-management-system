import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { errorMessage } from "../api";
import { useCart } from "../context/CartContext";

const PENDING_ORDER_KEY = "campusbites.pending-order";

const fmtSlot = (iso) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

async function getRequestFingerprint(payload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function getIdempotencyKey(payload) {
  let fingerprint;
  try {
    fingerprint = await getRequestFingerprint(payload);
  } catch {
    throw new Error("Secure checkout retry protection is unavailable in this browser. Please use an updated browser.");
  }

  let pending;
  try {
    pending = JSON.parse(localStorage.getItem(PENDING_ORDER_KEY) || "null");
    if (pending?.fingerprint === fingerprint && /^[A-Za-z0-9_-]{20,128}$/.test(pending.key)) {
      return pending.key;
    }
    const key = crypto.randomUUID();
    localStorage.setItem(PENDING_ORDER_KEY, JSON.stringify({ fingerprint, key }));
    return key;
  } catch {
    throw new Error("Your browser could not save checkout retry protection. Enable site storage and try again.");
  }
}

export default function Cart() {
  const { items, canteen, addItem, decrease, remove, clearCart, total } = useCart();
  const navigate = useNavigate();
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState(""); // ISO start time of the chosen slot
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [slotError, setSlotError] = useState("");
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const [note, setNote] = useState("");
  const canteenId = canteen?._id;

  // check whether the canteen is still open
  useEffect(() => {
    if (!canteenId) return;
    let active = true;
    api
      .get(`/canteens/${canteenId}`)
      .then((res) => {
        if (!active) return;
        setIsOpen(res.data.isOpen);
        setAvailabilityError("");
      })
      .catch((err) => {
        if (active) setAvailabilityError(errorMessage(err));
      })
      .finally(() => {
        if (active) setAvailabilityChecked(true);
      });
    return () => { active = false; };
  }, [canteenId]);

  // load the pickup slots; keep the chosen slot if it is still free, else pick the first free one
  const loadSlots = useCallback(() => {
    if (!canteenId) return;
    setSlotsLoading(true);
    api
      .get(`/canteens/${canteenId}/slots`)
      .then((res) => {
        setSlots(res.data);
        setSlotError("");
        setSlot((cur) => {
          if (res.data.find((s) => s.start === cur && !s.full)) return cur;
          const firstFree = res.data.find((s) => !s.full);
          return firstFree ? firstFree.start : "";
        });
      })
      .catch((err) => setSlotError(errorMessage(err)))
      .finally(() => setSlotsLoading(false));
  }, [canteenId]);

  // refresh every minute so past slots drop off
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch the selected canteen's available pickup slots
    loadSlots();
    const timer = setInterval(loadSlots, 60000);
    return () => clearInterval(timer);
  }, [loadSlots]);

  const placeOrder = async () => {
    if (busy || !isOpen || !availabilityChecked || !slot) return;
    setError("");
    setBusy(true);
    const payload = {
      items: items.map((i) => ({ menuItemId: i.menuItemId, qty: i.qty })),
      pickupTime: slot,
      note,
    };
    try {
      const idempotencyKey = await getIdempotencyKey(payload);
      const result = await api.post("/orders", payload, {
        headers: { "Idempotency-Key": idempotencyKey },
      });
      if (!result.data?._id || typeof result.data.orderNumber !== "string") {
        throw new Error("The server response did not confirm an order. Your cart has been kept.");
      }
      localStorage.removeItem(PENDING_ORDER_KEY);
      clearCart();
      navigate("/orders", {
        state: {
          orderConfirmation: {
            orderNumber: result.data.orderNumber,
            pickupTime: result.data.pickupTime || slot,
            total: result.data.total,
          },
        },
      });
    } catch (err) {
      setError(errorMessage(err, {
        fallback: "We couldn't complete your order. Your cart is saved. Check My Orders before retrying.",
        network: "We couldn't complete your order. Your cart is saved. Check My Orders before retrying.",
        timeout: "We couldn't confirm your order yet. Your cart is saved. Check My Orders before retrying.",
      }));
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
          {!slot && <option value="" disabled>{slotsLoading ? "Loading pickup times..." : "Select pickup time"}</option>}
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
      {slotError && <p className="error" role="alert">{slotError}</p>}
      {availabilityError && <p className="error" role="alert">{availabilityError}</p>}
      {availabilityChecked && !availabilityError && !isOpen && <p className="error">This canteen is closed right now. You can't place an order.</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <p className="muted">You pay at the counter when you collect.</p>
      <aside className="cart-collection-notice" role="note" aria-labelledby="cart-collection-title">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22">
          <path d="M12 3 2.8 20h18.4L12 3Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M12 9v5m0 3h.01" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <div>
          <strong id="cart-collection-title">Please collect the order you place.</strong>
          <p>
            An order that remains ready for pickup may be recorded as uncollected and block ordering.
            If the canteen cannot fulfil it or its status is incorrect, speak with canteen staff so
            they can review and correct the order.
          </p>
        </div>
      </aside>
      <label className="field">
        Note for the canteen (optional)
        <input
          value={note}
          maxLength={100}
          placeholder="e.g. less spicy, no onion"
          onChange={(e) => setNote(e.target.value)}
        />
        <small className="muted">{note.length}/100</small>
      </label>
      <button onClick={placeOrder} disabled={busy || !availabilityChecked || !isOpen || !slot || slotsLoading}>
        {busy ? "Placing order..." : "Place order"}
      </button>
      {busy && <p className="muted" role="status">Saving your order securely. Please keep this page open.</p>}
    </div>
  );
}