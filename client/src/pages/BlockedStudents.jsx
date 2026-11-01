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
  const [message, setMessage] = useState("");
  const [reviewNotes, setReviewNotes] = useState({});
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- avoid displaying another canteen's blocked users while reloading
    setStudents([]);
    setLoading(true);
    load();
  }, [load]);

  const unblock = async (s) => {
    await submitReview(s, "unblock");
  };

  const submitReview = async (student, decision, orderId) => {
    const explanation = (reviewNotes[student._id] || "").trim();
    if (explanation.length < 10 || explanation.length > 500) {
      setError("Record the student's explanation and your review in 10–500 characters.");
      return;
    }
    if (decision === "unblock" && !window.confirm(`After reviewing ${student.name}'s order history and explanation, approve unblocking? All no-show orders must already be paid at the counter.`)) return;
    if (decision.startsWith("order_corrected:") && !window.confirm(`Confirm the no-show was caused by a canteen or verified system error, and correct the order to ${decision.split(":")[1]}? The related block may be removed.`)) return;

    setBusyId(`${decision}:${student._id}`);
    setError("");
    setMessage("");
    try {
      if (decision.startsWith("order_corrected:")) {
        const correctedStatus = decision.split(":")[1];
        await api.patch(`/orders/${orderId}/review-no-show`, { explanation, correctedStatus });
      } else {
        await api.patch(`/canteens/${canteenId}/review/${student._id}`, { explanation, decision });
      }
      setReviewNotes((current) => ({ ...current, [student._id]: "" }));
      setMessage(
        decision === "unblock"
          ? `${student.name} was unblocked after review.`
          : decision === "keep_blocked"
            ? `Review recorded. ${student.name} remains blocked.`
            : "No-show corrected as a canteen/system issue."
      );
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
      {error && <p className="error" role="alert">{error}</p>}
      {message && <p className="success-message" role="status">{message}</p>}

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
              <p className="muted">Review the student's explanation and order history. Record payment for outstanding no-show orders before approving an unblock.</p>
              <ul className="blocked-order-list">
                {s.noShowOrders.map((o) => (
                  <li className="blocked-order-row" key={o._id}>
                    <div className="blocked-order-details">
                      <b>Order #{o.orderNumber} · ₹{o.total}</b>
                      <span className="muted">Pickup {fmtDate(o.pickupTime)}</span>
                      {o.readyAt && <span className="muted">Marked ready {fmtDate(o.readyAt)}</span>}
                      {o.noShowAt && <span className="muted">Marked uncollected {fmtDate(o.noShowAt)}</span>}
                    </div>
                    {o.paymentStatus === "paid" ? (
                      <span className="blocked-paid" aria-label="Payment recorded">Paid</span>
                    ) : (
                      <button
                        className="small"
                        disabled={busyId !== null}
                        onClick={async () => {
                          if (!window.confirm(`Confirm you received ₹${o.total} for no-show order #${o.orderNumber} at the counter?`)) return;
                          setBusyId(`payment:${o._id}`);
                          try {
                            await api.patch(`/orders/${o._id}/payment`);
                            await load();
                          } catch (err) {
                            setError(errorMessage(err));
                          } finally {
                            setBusyId(null);
                          }
                        }}
                      >
                        Confirm payment
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <label className="field">
                Student's explanation or reason for correcting this no-show (10–500 characters)
                <textarea
                  rows="3"
                  maxLength={500}
                  value={reviewNotes[s._id] || ""}
                  onChange={(event) => setReviewNotes((current) => ({ ...current, [s._id]: event.target.value }))}
                  placeholder="Record the student's account of events, or why this no-show needs correction..."
                />
              </label>
              <div className="blocked-review-actions">
                <button
                  type="button"
                  className="small"
                  disabled={busyId !== null}
                  onClick={() => submitReview(s, "keep_blocked")}
                >
                  {busyId === `keep_blocked:${s._id}` ? "Saving..." : "Keep blocked and record review"}
                </button>
                <button
                  type="button"
                  className="blocked-unblock"
                  disabled={busyId !== null}
                  onClick={() => unblock(s)}
                >
                  {busyId === `unblock:${s._id}` ? "Updating..." : "Approve unblocking"}
                </button>
              </div>
              {s.noShowOrders.map((order) => (
                <button
                  key={`resolve-${order._id}`}
                  type="button"
                  className="small"
                  disabled={busyId !== null}
                  onClick={() => submitReview(s, "order_corrected:collected", order._id)}
                >
                  Correct #{order.orderNumber}: order was collected
                </button>
              ))}
              {s.noShowOrders.map((order) => (
                <button
                  key={`resolve-cancelled-${order._id}`}
                  type="button"
                  className="small"
                  disabled={busyId !== null}
                  onClick={() => submitReview(s, "order_corrected:cancelled", order._id)}
                >
                  Correct #{order.orderNumber}: cancel due to canteen/system issue
                </button>
              ))}
              {s.reviews?.length > 0 && (
                <details className="no-show-review-history">
                  <summary>Previous staff reviews ({s.reviews.length})</summary>
                  {s.reviews.map((review) => (
                    <p key={review._id}>
                      {fmtDate(review.createdAt)} · {review.decision.replaceAll("_", " ")}
                      {review.correctedStatus ? ` (${review.correctedStatus})` : ""}
                      {review.reviewedBy?.name ? ` · ${review.reviewedBy.name}` : ""}
                      <br />{review.explanation}
                    </p>
                  ))}
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}