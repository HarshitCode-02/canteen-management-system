import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import api, { errorMessage } from "../api";
import { connectSocket } from "../socket";

function LateButton({ order }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (order.lateExtended || done) {
    return <p className="muted">Extra 10 minutes added. Please come soon.</p>;
  }

  const tap = async () => {
    if (!window.confirm("Add 10 extra minutes? You can do this only once.")) return;
    setBusy(true);
    setError("");
    try {
      await api.patch(`/orders/${order._id}/late`);
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button className="small" onClick={tap} disabled={busy}>
        {busy ? "Adding..." : "I'm running late (+10 min)"}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

function ReorderButton({ order }) {
  const { items: cartItems, replaceCart } = useCart();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const reorder = async () => {
    if (cartItems.length > 0 && !window.confirm("Replace the items in your cart?")) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await api.get(`/canteens/${order.canteen._id}/menu`);
      const { canteen, items } = res.data;
      if (!canteen.isOpen) {
        setMsg(`${canteen.name} is closed right now.`);
        return;
      }
      const list = [];
      const skipped = [];
      for (const oi of order.items) {
        const id = String(oi.menuItem?._id || oi.menuItem);
        const m = items.find((x) => x._id === id && x.isAvailable !== false);
        if (m) {
          list.push({
            menuItemId: m._id,
            name: m.name,
            price: m.price,
            qty: Math.min(oi.qty, 20),
          });
        } else {
          skipped.push(oi.name);
        }
      }
      if (list.length === 0) {
        setMsg("None of these items are available now.");
        return;
      }
      if (
        skipped.length &&
        !window.confirm(`Not available now: ${skipped.join(", ")}. Continue without them?`)
      )
        return;
      replaceCart(canteen, list);
      navigate("/cart");
    } catch (err) {
      setMsg(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button className="small" onClick={reorder} disabled={busy}>
        {busy ? "Checking menu..." : "Reorder"}
      </button>
      {msg && <p className="error">{msg}</p>}
    </>
  );
}

const LABELS = {
  placed: "Order received",
  preparing: "Being prepared",
  ready: "Ready for pickup",
  collected: "Collected",
  cancelled: "Cancelled",
  no_show: "No-show (not collected)",
};
const ACTIVE = ["placed", "preparing", "ready"];

const fmtTime = (d) =>
  new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

function OrderCard({ order, onCancel }) {
  return (
    <div className={`order-card status-${order.status}`}>
      <div className="order-head">
        <h3>#{order.orderNumber}</h3>
        <span className="status-pill">{LABELS[order.status]}</span>
      </div>

      {order.canteen?.name && <p className="muted">{order.canteen.name}</p>}

      {order.note && <p className="muted">Note: {order.note}</p>}

      {order.status === "no_show" && (
        <p className="error">You did not collect this order.</p>
      )}

      {order.pickupCode && (
        <div className="pickup-code">
          <span>Pickup code</span>
          <b>{order.pickupCode}</b>
          <small>Show this at the counter</small>
        </div>
      )}

      {order.status === "ready" && (
        <p className="ready-banner">
          Your order is ready! Collect it at the counter and pay ₹{order.total}.
        </p>
      )}

      {order.status === "ready" && <LateButton order={order} />}

      <ul>
        {order.items.map((i, idx) => (
          <li key={idx}>
            {i.qty} × {i.name} — ₹{i.price * i.qty}
          </li>
        ))}
      </ul>

      <p className="muted">
        Total ₹{order.total} · Pickup around {fmtTime(order.pickupTime)} ·{" "}
        {fmtDate(order.createdAt)}
        {order.paymentStatus === "paid" && " · Paid"}
      </p>

      {order.status === "placed" && (
        <button className="small danger" onClick={() => onCancel(order._id)}>
          Cancel order
        </button>
      )}

      {["collected", "cancelled", "no_show"].includes(order.status) && (
        <ReorderButton order={order} />
      )}
    </div>
  );
}

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/orders/my");
      setOrders(res.data);
      setError("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // load now, then slow polling every 30 seconds (fallback if the socket drops)
  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return;
    const onUpdated = (p) => {
      load();
      if (
        p.status === "ready" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification(`Order ${p.orderNumber} is ready!`, {
          body: "Collect it at the counter.",
        });
      }
    };
    socket.on("orderUpdated", onUpdated);
    return () => socket.off("orderUpdated", onUpdated);
  }, [load]);

  // is this student blocked? refresh on load, every 30s, and on socket events
  const refreshBlocked = useCallback(() => {
    api
      .get("/auth/me")
      .then((res) => setBlocked(!!res.data.user?.isBlocked))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshBlocked();
    const timer = setInterval(refreshBlocked, 30000);
    const socket = connectSocket();
    if (socket) {
      socket.on("orderUpdated", refreshBlocked);
      socket.on("accountUpdated", refreshBlocked);
    }
    return () => {
      clearInterval(timer);
      if (socket) {
        socket.off("orderUpdated", refreshBlocked);
        socket.off("accountUpdated", refreshBlocked);
      }
    };
  }, [refreshBlocked]);

  const cancel = async (id) => {
    if (!window.confirm("Cancel this order?")) return;
    try {
      await api.patch(`/orders/${id}/cancel`);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (loading) return <p className="center">Loading orders...</p>;

  const active = orders.filter((o) => ACTIVE.includes(o.status));
  const past = orders.filter((o) => !ACTIVE.includes(o.status));

  const canteenNames = [
    ...new Set(
      orders
        .filter((o) => o.status === "no_show")
        .map((o) => o.canteen?.name)
        .filter(Boolean)
    ),
  ].join(", ");

  return (
    <div>
      {error && <p className="error">{error}</p>}

      {blocked && (
        <div className="blocked-banner">
          <b>You are blocked from placing orders.</b>
          <p>
            You did not collect an order from {canteenNames || "the canteen"}. Pay the
            fine at that canteen's counter and ask the staff to unblock you.
          </p>
        </div>
      )}

      {"Notification" in window && Notification.permission === "default" && (
        <button onClick={() => Notification.requestPermission()}>
          Enable notifications
        </button>
      )}

      <h2>Current order</h2>
      {active.length === 0 ? (
        <p className="muted">
          No active order. <Link to="/">Browse the menu</Link>
        </p>
      ) : (
        active.map((o) => <OrderCard key={o._id} order={o} onCancel={cancel} />)
      )}

      <h2>Past orders</h2>
      {past.length === 0 ? (
        <p className="muted">Nothing here yet.</p>
      ) : (
        past.map((o) => <OrderCard key={o._id} order={o} onCancel={cancel} />)
      )}
    </div>
  );
}