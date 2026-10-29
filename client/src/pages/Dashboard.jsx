import { useCallback, useEffect, useState } from "react";
import api, { errorMessage } from "../api";

const NEXT = {
  placed: { status: "preparing", label: "Start preparing" },
  preparing: { status: "ready", label: "Mark ready" },
  ready: { status: "collected", label: "Collected & paid" },
};

const LABELS = {
  placed: "New",
  preparing: "Preparing",
  ready: "Ready",
};

const fmtTime = (d) =>
  new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/orders");
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

  const setStatus = async (order, status, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusyId(order._id);
    try {
      await api.patch(`/orders/${order._id}/status`, { status });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <p className="center">Loading orders...</p>;

  const newCount = orders.filter((o) => o.status === "placed").length;

  return (
    <div>
      <div className="dash-head">
        <h2>Orders ({orders.length})</h2>
        <span className="muted">
          {newCount} new · refreshes every 10s
        </span>
      </div>

      {error && <p className="error">{error}</p>}

      {orders.length === 0 ? (
        <p className="muted">No active orders right now.</p>
      ) : (
        <div className="dash-grid">
          {orders.map((o) => {
            const next = NEXT[o.status];
            const busy = busyId === o._id;
            return (
              <div key={o._id} className={`order-card status-${o.status}`}>
                <div className="order-head">
                  <h3>#{o.orderNumber}</h3>
                  <span className="status-pill">{LABELS[o.status]}</span>
                </div>

                <p>
                  <b>{o.user?.name}</b>
                  {o.user?.phone && (
                    <>
                      {" · "}
                      <a href={`tel:${o.user.phone}`}>{o.user.phone}</a>
                    </>
                  )}
                </p>

                <ul>
                  {o.items.map((i, idx) => (
                    <li key={idx}>{i.qty} × {i.name}</li>
                  ))}
                </ul>

                <p className="muted">
                  Total ₹{o.total} · Pickup {fmtTime(o.pickupTime)} · Ordered {fmtTime(o.createdAt)}
                </p>

                <div className="dash-actions">
                  {next && (
                    <button disabled={busy} onClick={() => setStatus(o, next.status)}>
                      {next.label}
                    </button>
                  )}
                  {o.status === "ready" && (
                    <button
                      className="small danger"
                      disabled={busy}
                      onClick={() =>
                        setStatus(o, "no_show", `Mark #${o.orderNumber} as no-show?`)
                      }
                    >
                      No-show
                    </button>
                  )}
                  {o.status !== "ready" && (
                    <button
                      className="small danger"
                      disabled={busy}
                      onClick={() =>
                        setStatus(o, "cancelled", `Cancel #${o.orderNumber}?`)
                      }
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}