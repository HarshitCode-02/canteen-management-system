import { useCallback, useEffect, useState } from "react";
import api, { errorMessage } from "../api";

export default function ReviewModeration() {
  const [visibility, setVisibility] = useState("visible");
  const [page, setPage] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    try {
      const result = await api.get("/admin/reviews", { params: { page, visibility } });
      setReviews(result.data.reviews);
      setTotal(result.data.total);
      setError("");
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [page, visibility]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch the selected moderation page from the API
    void load();
  }, [load]);

  const moderate = async (review) => {
    setBusyId(review._id);
    setError("");
    try {
      await api.patch(`/admin/reviews/${review._id}/moderation`, { isVisible: !review.isVisible });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId("");
    }
  };

  return (
    <section>
      <h1>Review moderation</h1>
      <label className="field">
        Review visibility
        <select value={visibility} onChange={(event) => { setVisibility(event.target.value); setPage(1); }}>
          <option value="visible">Visible</option>
          <option value="hidden">Hidden</option>
          <option value="all">All reviews</option>
        </select>
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      {reviews.length === 0 ? <p className="muted">No reviews in this view.</p> : reviews.map((review) => (
        <article className="moderation-review" key={review._id}>
          <p><b>{review.rating}/5</b> · {review.menuItem?.name || "Deleted menu item"} · Order {review.order?.orderNumber || "unknown"}</p>
          <p className="muted">By {review.user?.name || "Account unavailable"} · {new Date(review.createdAt).toLocaleString("en-IN")}</p>
          {review.text && <p>{review.text}</p>}
          <button type="button" className="small" disabled={busyId === review._id} onClick={() => moderate(review)}>
            {review.isVisible ? "Hide review" : "Restore review"}
          </button>
        </article>
      ))}
      <div className="account-actions">
        <button type="button" className="small" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
        <span className="muted">Page {page} · {total} total</span>
        <button type="button" className="small" disabled={page * 25 >= total} onClick={() => setPage((value) => value + 1)}>Next</button>
      </div>
    </section>
  );
}
