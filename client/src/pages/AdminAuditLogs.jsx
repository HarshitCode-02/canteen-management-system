import { useCallback, useEffect, useState } from "react";
import api, { errorMessage } from "../api";

const EVENT_TYPES = [
  "order.created",
  "order.status_changed",
  "order.cancelled",
  "order.collected",
  "order.payment_confirmed",
  "order.no_show",
  "menu.created",
  "menu.updated",
  "menu.deleted",
  "canteen.created",
  "canteen.updated",
  "canteen.open_changed",
  "staff.created",
  "staff.canteens_changed",
  "user.unblocked",
  "user.blocked",
  "user.password_reset",
  "review.moderated",
];

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [canteens, setCanteens] = useState([]);
  const [eventType, setEventType] = useState("");
  const [canteenId, setCanteenId] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const params = { page };
      if (eventType) params.eventType = eventType;
      if (canteenId) params.canteen = canteenId;
      const [auditResponse, canteenResponse] = await Promise.all([
        api.get("/admin/audit-logs", { params }),
        api.get("/canteens"),
      ]);
      setLogs(auditResponse.data.logs);
      setTotal(auditResponse.data.total);
      setCanteens(canteenResponse.data);
      setError("");
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [page, eventType, canteenId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load the selected audit-log page from the API
    void load();
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / 25));

  return (
    <section>
      <h2>Admin audit log</h2>
      <p className="muted">Successful order, payment, menu, canteen, account, and review moderation actions.</p>
      {error && <p className="error" role="alert">{error}</p>}

      <div className="card row">
        <label className="field">
          Action
          <select value={eventType} onChange={(event) => {
            setEventType(event.target.value);
            setPage(1);
          }}>
            <option value="">All actions</option>
            {EVENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <label className="field">
          Canteen
          <select value={canteenId} onChange={(event) => {
            setCanteenId(event.target.value);
            setPage(1);
          }}>
            <option value="">All canteens</option>
            {canteens.map((canteen) => <option key={canteen._id} value={canteen._id}>{canteen.name}</option>)}
          </select>
        </label>
      </div>

      <div className="card wide">
        {logs.length === 0 ? <p>No audit events found.</p> : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>When</th><th>Action</th><th>Actor</th><th>Target</th><th>Details</th></tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                    <td>{log.eventType}</td>
                    <td>{log.actor?.name || "System"} ({log.actorRole})</td>
                    <td>{log.entityType}{log.canteen?.name ? ` · ${log.canteen.name}` : ""}</td>
                    <td>{Object.keys(log.details || {}).length ? JSON.stringify(log.details) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="row">
          <span className="muted">{total} events · page {page} of {pages}</span>
          <button type="button" className="small" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
          <button type="button" className="small" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Next</button>
        </div>
      </div>
    </section>
  );
}
