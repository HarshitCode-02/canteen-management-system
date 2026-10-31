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
  const [filterError, setFilterError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async (active) => {
    setLoading(true);
    setError("");
    try {
      const params = { page };
      if (eventType) params.eventType = eventType;
      if (canteenId) params.canteen = canteenId;
      const auditResponse = await api.get("/admin/audit-logs", { params });
      if (!active()) return;
      setLogs(auditResponse.data.logs);
      setTotal(auditResponse.data.total);
    } catch (err) {
      if (active()) {
        setLogs([]);
        setTotal(0);
        setError(errorMessage(err));
      }
    } finally {
      if (active()) setLoading(false);
    }
  }, [page, eventType, canteenId]);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load the selected audit-log page from the API
    void load(() => active);
    return () => { active = false; };
  }, [load, reloadKey]);

  useEffect(() => {
    let active = true;
    api.get("/canteens")
      .then((response) => {
        if (active) {
          setCanteens(response.data);
          setFilterError("");
        }
      })
      .catch((err) => {
        if (active) setFilterError(errorMessage(err));
      });
    return () => { active = false; };
  }, []);

  const pages = Math.max(1, Math.ceil(total / 25));
  const formatEvent = (type) => type.split(".").map((part) =>
    part.replaceAll("_", " ")
  ).join(" · ");
  const formatDate = (value) => new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

  return (
    <section>
      <h1>Admin audit log</h1>
      <p className="muted">Successful order, payment, menu, canteen, account, and review moderation actions.</p>
      {filterError && <p className="error" role="alert">Canteen filters could not be loaded: {filterError}</p>}
      {error && (
        <div className="error audit-error" role="alert">
          <span>{error}</span>
          <button type="button" className="small" onClick={() => setReloadKey((value) => value + 1)}>Try again</button>
        </div>
      )}

      <div className="audit-filters">
        <label className="field">
          Action
          <select value={eventType} onChange={(event) => {
            setEventType(event.target.value);
            setPage(1);
          }}>
            <option value="">All actions</option>
            {EVENT_TYPES.map((type) => <option key={type} value={type}>{formatEvent(type)}</option>)}
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

      {loading ? (
        <p className="center" role="status">Loading audit events...</p>
      ) : logs.length === 0 ? (
        <div className="audit-empty">
          <h2>No audit events found</h2>
          <p className="muted">Try another action or canteen filter.</p>
        </div>
      ) : (
        <>
          <div className="audit-log-list" aria-live="polite">
            {logs.map((log) => (
              <article className="audit-log-entry" key={log._id}>
                <div className="audit-log-entry-head">
                  <span className="audit-event-type">{formatEvent(log.eventType)}</span>
                  <time dateTime={log.createdAt}>{formatDate(log.createdAt)}</time>
                </div>
                <dl>
                  <div><dt>Actor</dt><dd>{log.actor?.name || "System"} · {log.actorRole}</dd></div>
                  <div><dt>Target</dt><dd>{log.entityType}{log.canteen?.name ? ` · ${log.canteen.name}` : ""}</dd></div>
                  <div>
                    <dt>Details</dt>
                    <dd>
                      {Object.entries(log.details || {}).length ? (
                        <ul className="audit-detail-list">
                          {Object.entries(log.details).map(([key, value]) => (
                            <li key={key}><b>{formatEvent(key)}:</b> {typeof value === "object" ? JSON.stringify(value) : String(value)}</li>
                          ))}
                        </ul>
                      ) : "No additional details recorded"}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
          <nav className="audit-pagination" aria-label="Audit log pages">
            <span className="muted">{total} events · page {page} of {pages}</span>
            <div>
              <button type="button" className="small" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</button>
              <button type="button" className="small" disabled={page >= pages || loading} onClick={() => setPage((value) => value + 1)}>Next</button>
            </div>
          </nav>
        </>
      )}
    </section>
  );
}
