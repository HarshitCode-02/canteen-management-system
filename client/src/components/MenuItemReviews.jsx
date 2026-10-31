import { useState } from "react";
import api, { errorMessage } from "../api";

export default function MenuItemReviews({ itemId }) {
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState("");

  const toggle = async () => {
    const opening = !visible;
    setVisible(opening);
    if (!opening || loaded) return;
    setError("");
    try {
      const result = await api.get(`/reviews/menu/${itemId}`);
      setReviews(result.data.reviews);
      setLoaded(true);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="menu-reviews">
      <button type="button" className="small link-button" onClick={toggle}>
        {visible ? "Hide reviews" : "Read reviews"}
      </button>
      {visible && error && <p className="error" role="alert">{error}</p>}
      {visible && loaded && reviews.length === 0 && <p className="muted">No reviews yet.</p>}
      {visible && reviews.map((review) => (
        <blockquote key={review._id}>
          <b>{review.rating}/5</b>
          {review.text && <p>{review.text}</p>}
          <small>{new Date(review.createdAt).toLocaleDateString("en-IN")}</small>
        </blockquote>
      ))}
    </div>
  );
}
