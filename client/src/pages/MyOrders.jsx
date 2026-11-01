import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useCart } from "../context/CartContext";
import api, { errorMessage } from "../api";
import { connectSocket } from "../socket";
import ReviewForm from "../components/ReviewForm";

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

function PickupQr({ order }) {
  const [qr, setQr] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.post(`/orders/${order._id}/pickup-qr`)
      .then((res) => {
        if (active) setQr(res.data);
      })
      .catch((err) => {
        if (active) setError(errorMessage(err));
      });
    return () => {
      active = false;
    };
  }, [order._id]);

  if (error) return <p className="error" role="alert">{error}</p>;
  if (!qr) return <p className="muted" role="status">Preparing your pickup QR...</p>;

  return (
    <div className="pickup-qr">
      <QRCodeSVG
        value={qr.token}
        size={180}
        title={`Pickup QR for order ${order.orderNumber}`}
      />
      <div>
        <b>QR pickup</b>
        <p className="muted">Show this at the counter. The four-digit code is a fallback.</p>
        <p className="muted">Valid until {fmtTime(qr.expiresAt)}.</p>
      </div>
    </div>
  );
}

function OrderCard({ order, onCancel, reviewedItems, onReviewed }) {
  return (
    <div className={`order-card status-${order.status}`}>
      <div className="order-head">
        <h3>#{order.orderNumber}</h3>
        <span className="status-pill">{LABELS[order.status]}</span>
      </div>

      {order.canteen?.name && <p className="muted">{order.canteen.name}</p>}

      {order.note && <p className="muted">Note: {order.note}</p>}

      {order.status === "no_show" && (
        <p className="error">
          This order was marked as not collected. If that is incorrect, explain what happened to canteen staff for review.{" "}
          {order.paymentStatus === "paid"
            ? "Payment has been recorded. Staff still need to review your account before unblocking it."
            : `Pay ₹${order.total} at the canteen counter and ask staff to record the payment. Staff will review your explanation before deciding whether to unblock your account.`}
        </p>
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

      {order.status === "ready" && <PickupQr order={order} />}

      {order.status === "ready" && <LateButton order={order} />}

      <ul>
        {order.items.map((i, idx) => (
          <li key={idx}>
            {i.qty} × {i.name} — ₹{i.price * i.qty}
          </li>
        ))}
      </ul>

      {order.status === "collected" && order.items.map((item, idx) => {
        const menuItemId = String(item.menuItem?._id || item.menuItem || "");
        return (
          <ReviewForm
            key={`${order._id}-${menuItemId || idx}`}
            order={order}
            item={item}
            existingReview={reviewedItems[`${order._id}:${menuItemId}`]}
            onReviewed={onReviewed}
          />
        );
      })}

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
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reviewedItems, setReviewedItems] = useState({});
  const [reviewError, setReviewError] = useState("");

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

  const collectedOrderIds = useMemo(
    () => orders.filter((order) => order.status === "collected").map((order) => order._id).join(","),
    [orders]
  );

  useEffect(() => {
    if (!collectedOrderIds) {
      return;
    }
    let active = true;
    api.get("/reviews/my", { params: { orders: collectedOrderIds } })
      .then((res) => {
        if (!active) return;
        setReviewedItems(Object.fromEntries(res.data.reviews.map((review) => [
          `${review.order}:${review.menuItem}`,
          review,
        ])));
        setReviewError("");
      })
      .catch((err) => {
        if (active) setReviewError(errorMessage(err));
      });
    return () => { active = false; };
  }, [collectedOrderIds]);

  const onReviewed = (orderId, menuItemId, review) => {
    setReviewedItems((current) => ({ ...current, [`${orderId}:${menuItemId}`]: review }));
  };

  // Load initially; the layout keeps this order list current across the app.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- start the initial API load when this page mounts
    load();
  }, [load]);

  useEffect(() => {
    const onOrdersUpdated = (event) => {
      setOrders(event.detail);
      setLoading(false);
    };
    window.addEventListener("campusbites:orders-updated", onOrdersUpdated);
    return () => window.removeEventListener("campusbites:orders-updated", onOrdersUpdated);
  }, []);

  // is this student blocked? refresh on load, every 30s, and on socket events
  const refreshBlocked = useCallback(() => {
    api
      .get("/auth/me")
      .then((res) => setBlocked(!!res.data.user?.isBlocked))
      .catch((err) => setError(errorMessage(err)));
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
      {location.state?.orderConfirmation && (
        <div className="ready-banner" role="status">
          <b>Order #{location.state.orderConfirmation.orderNumber} is confirmed.</b>
          <p>Pickup: {fmtTime(location.state.orderConfirmation.pickupTime)} · Total: ₹{location.state.orderConfirmation.total}</p>
          <p>Track the order below and collect it when its status changes to Ready.</p>
        </div>
      )}
      {error && <p className="error">{error}</p>}
      {collectedOrderIds && reviewError && <p className="error" role="alert">{reviewError}</p>}

      {blocked && (
        <div className="blocked-banner">
          <b>You are blocked from placing orders.</b>
          <p>
            An order from {canteenNames || "a canteen"} was marked as not collected. Visit the relevant canteen
            to explain what happened and request a staff review. Pay any outstanding no-show order amount
            at the counter; staff must record all outstanding payments before approving an unblock.
          </p>
        </div>
      )}

      {"Notification" in window && Notification.permission === "default" && (
        <div>
          <p className="muted">Optional browser alerts can announce when an order is ready while the app is open. In-site updates work without permission.</p>
          <button type="button" onClick={() => Notification.requestPermission()}>
            Enable browser alerts
          </button>
        </div>
      )}

      <h2>Current order</h2>
      {active.length === 0 ? (
        <p className="muted">
          No active order. <Link to="/">Browse the menu</Link>
        </p>
      ) : (
        active.map((o) => <OrderCard key={o._id} order={o} onCancel={cancel} reviewedItems={reviewedItems} onReviewed={onReviewed} />)
      )}

      <h2>Past orders</h2>
      {past.length === 0 ? (
        <p className="muted">Nothing here yet.</p>
      ) : (
        past.map((o) => <OrderCard key={o._id} order={o} onCancel={cancel} reviewedItems={reviewedItems} onReviewed={onReviewed} />)
      )}
    </div>
  );
}