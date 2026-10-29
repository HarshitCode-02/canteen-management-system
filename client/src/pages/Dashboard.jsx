import { useCallback, useEffect, useState } from "react";
import api, { errorMessage } from "../api";
import useStaffCanteen from "../useStaffCanteen";
import CanteenSwitcher from "../components/CanteenSwitcher";

const NEXT = {
  placed: { status: "preparing", label: "Start preparing" },
  preparing: { status: "ready", label: "Mark ready" },
};

const LABELS = {
  placed: "New",
  preparing: "Preparing",
  ready: "Ready",
  collected: "Collected",
};

const fmtTime = (d) =>
  new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [codes, setCodes] = useState({}); // order id -> code being typed
  const [payNow, setPayNow] = useState({}); // order id -> false if "payment received" unticked
  const { canteens, canteen, canteenId, setCanteenId, error: canteenError } = useStaffCanteen();

  const load = useCallback(async () => {
    if (!canteenId) return;
    try {
      const res = await api.get("/orders", { params: { canteen: canteenId } });
      setOrders(res.data);
      setError("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [canteenId]);

  // load now, then poll every 10 seconds; reset the list when the canteen changes
  useEffect(() => {
    setOrders([]);
    setLoading(true);
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [load]);

  const run = async (order, request) => {
    setBusyId(order._id);
    setError("");
    try {
      await request();
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const setStatus = (order, status, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    return run(order, () => api.patch(`/orders/${order._id}/status`, { status }));
  };

  const collect = (order) => {
    const code = (codes[order._id] || "").trim();
    if (!code) {
      setError("Enter the pickup code first");
      return;
    }
    return run(order, async () => {
      await api.patch(`/orders/${order._id}/verify`, {
        code,
        paid: payNow[order._id] !== false,
      });
      setCodes((c) => {
        const copy = { ...c };
        delete copy[order._id];
        return copy;
      });
    });
  };

  const confirmPayment = (order) =>
    run(order, () => api.patch(`/orders/${order._id}/payment`));

  if (canteenError) return <p className="error">{canteenError}</p>;
  if (loading) return <p className="center">Loading orders...</p>;

  const newCount = orders.filter((o) => o.status === "placed").length;

  return (
    <div>
      <div className="dash-head">
        <h2>{canteen?.name} orders ({orders.length})</h2>
        <span className="muted">
          {newCount} new · refreshes every 10s
        </span>
      </div>

      <CanteenSwitcher
        canteens={canteens}
        canteenId={canteenId}
        onChange={setCanteenId}
      />

      {error && <p className="error">{error}</p>}

      {orders.length === 0 ? (
        <p className="muted">No active orders right now.</p>
      ) : (
        <div className="dash-grid">
          {orders.map((o) => {
            const next = NEXT[o.status];
            const busy = busyId === o._id;
            const paid = o.paymentStatus === "paid";
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
                  Total ₹{o.total} · {paid ? "Paid" : "Payment pending"} · Pickup {fmtTime(o.pickupTime)} · Ordered {fmtTime(o.createdAt)}
                </p>

                {o.status === "ready" && (
                  <div>
                    <input
                      className="code-input"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="Pickup code"
                      value={codes[o._id] || ""}
                      onChange={(e) =>
                        setCodes({ ...codes, [o._id]: e.target.value.replace(/\D/g, "") })
                      }
                    />
                    <label className="pay-check">
                      <input
                        type="checkbox"
                        checked={payNow[o._id] !== false}
                        onChange={(e) => setPayNow({ ...payNow, [o._id]: e.target.checked })}
                      />
                      Payment received
                    </label>
                  </div>
                )}

                <div className="dash-actions">
                  {next && (
                    <button disabled={busy} onClick={() => setStatus(o, next.status)}>
                      {next.label}
                    </button>
                  )}
                  {o.status === "ready" && (
                    <button disabled={busy} onClick={() => collect(o)}>
                      Collect
                    </button>
                  )}
                  {o.status === "collected" && !paid && (
                    <button disabled={busy} onClick={() => confirmPayment(o)}>
                      Confirm payment
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
                  {(o.status === "placed" || o.status === "preparing") && (
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