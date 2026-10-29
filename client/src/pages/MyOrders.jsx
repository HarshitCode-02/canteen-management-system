import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../api";

const LABELS = {
  placed: "Order received",
  preparing: "Being prepared",
  ready: "Ready for pickup",
  collected: "Collected",
  cancelled: "Cancelled",
  no_show: "Not collected",
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

      <ul>
        {order.items.map((i, idx) => (
          <li key={idx}>{i.qty} × {i.name} — ₹{i.price * i.qty}</li>
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
    </div>
  );
}

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
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

  // load now, then poll every 10 seconds
  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [load]);

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

  return (
    <div>
      {error && <p className="error">{error}</p>}

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