import { useCallback, useEffect, useState } from "react";
import api, { errorMessage } from "../api";
import useStaffCanteen from "../useStaffCanteen";
import CanteenSwitcher from "../components/CanteenSwitcher";

const fmtDate = (d) =>
  new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function BlockedStudents() {
  const { canteens, canteen, canteenId, setCanteenId, error: canteenError } = useStaffCanteen();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    if (!canteenId) return;
    try {
      const res = await api.get(`/canteens/${canteenId}/blocked`);
      setStudents(res.data);
      setError("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [canteenId]);

  useEffect(() => {
    setStudents([]);
    setLoading(true);
    load();
  }, [load]);

  const unblock = async (s) => {
    if (!window.confirm(`Has ${s.name} paid the fine? This will unblock them.`)) return;
    setBusyId(s._id);
    try {
      await api.patch(`/canteens/${canteenId}/unblock/${s._id}`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  if (canteenError) return <p className="error">{canteenError}</p>;
  if (loading) return <p className="center">Loading...</p>;

  return (
    <div>
      <h2>{canteen?.name} blocked students ({students.length})</h2>
      <CanteenSwitcher canteens={canteens} canteenId={canteenId} onChange={setCanteenId} />
      {error && <p className="error">{error}</p>}

      {students.length === 0 ? (
        <p className="muted">No blocked students from this canteen.</p>
      ) : (
        <div className="dash-grid">
          {students.map((s) => (
            <div key={s._id} className="order-card status-no_show">
              <h3>{s.name}</h3>
              <p>
                {s.phone && <a href={`tel:${s.phone}`}>{s.phone}</a>}
                {s.blockedAt && <span className="muted"> · blocked {fmtDate(s.blockedAt)}</span>}
              </p>
              <p className="muted">Orders not collected here:</p>
              <ul>
                {s.noShowOrders.map((o) => (
                  <li key={o._id}>#{o.orderNumber} · ₹{o.total} · pickup {fmtDate(o.pickupTime)}</li>
                ))}
              </ul>
              <button disabled={busyId === s._id} onClick={() => unblock(s)}>
                Fine paid, unblock
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}