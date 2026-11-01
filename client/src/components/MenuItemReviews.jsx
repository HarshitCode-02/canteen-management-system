import { useState } from "react";
import api, { errorMessage, errorMessages } from "../api";

export default function MenuItemReviews({ itemId }) {
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState("");

  const loadReviews = async (nextPage) => {
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const result = await api.get(`/reviews/menu/${itemId}`, { params: { page: nextPage } });
      if (
        !Array.isArray(result.data?.reviews)
        || !Number.isInteger(result.data.page)
        || !Number.isFinite(result.data.total)
      ) {
        throw new Error("Reviews returned an unexpected response");
      }
      setReviews((current) => nextPage === 1 ? result.data.reviews : [...current, ...result.data.reviews]);
      setPage(result.data.page);
      setTotal(result.data.total);
      setLoaded(true);
    } catch (err) {
      setError(errorMessage(err, errorMessages.reviews));
    } finally {
      setLoading(false);
    }
  };

  const toggle = async () => {
    const opening = !visible;
    setVisible(opening);
    if (!opening || loaded) return;
    await loadReviews(1);
  };

  return (
    <div className="menu-reviews">
      <button type="button" className="small link-button" onClick={toggle} aria-expanded={visible}>
        {visible ? "Hide reviews" : "Read reviews"}
      </button>
      {visible && error && <p className="error" role="alert">{error}</p>}
      {visible && loaded && reviews.length === 0 && <p className="muted">No reviews yet.</p>}
      {visible && error && (
        <button type="button" className="small link-button" onClick={() => loadReviews(loaded ? page + 1 : 1)} disabled={loading}>
          Try again
        </button>
      )}
      {visible && reviews.map((review) => (
        <blockquote key={review._id}>
          <p className="review-author"><b>{review.user?.name || "Former user"}</b> · {review.rating}/5</p>
          {review.text && <p>{review.text}</p>}
          <small>{new Date(review.createdAt).toLocaleDateString("en-IN")}</small>
        </blockquote>
      ))}
      {visible && loaded && reviews.length < total && (
        <button type="button" className="small link-button" onClick={() => loadReviews(page + 1)} disabled={loading}>
          {loading ? "Loading..." : "Load more reviews"}
        </button>
      )}
      {visible && loading && !loaded && <p className="muted" role="status">Loading reviews...</p>}
    </div>
  );
}
