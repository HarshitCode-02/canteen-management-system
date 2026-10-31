import { useState } from "react";
import api, { errorMessage } from "../api";

export default function ReviewForm({ order, item, existingReview, onReviewed }) {
  const [rating, setRating] = useState("5");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const menuItemId = String(item.menuItem?._id || item.menuItem || "");

  if (!menuItemId) return <p className="muted">Review unavailable for this older order item.</p>;
  if (existingReview) {
    return <p className="reviewed-note" role="status">Your review: {existingReview.rating}/5{existingReview.text ? ` · ${existingReview.text}` : ""}</p>;
  }

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api.post("/reviews", {
        orderId: order._id,
        menuItemId,
        rating: Number(rating),
        text,
      });
      onReviewed(order._id, menuItemId, result.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="review-form" onSubmit={submit}>
      <label>
        Rate {item.name}
        <select value={rating} onChange={(event) => setRating(event.target.value)}>
          {[5, 4, 3, 2, 1].map((value) => <option value={value} key={value}>{value} star{value === 1 ? "" : "s"}</option>)}
        </select>
      </label>
      <label>
        Optional review
        <textarea maxLength={500} value={text} onChange={(event) => setText(event.target.value)} />
      </label>
      <button type="submit" className="small" disabled={busy}>{busy ? "Submitting..." : "Submit review"}</button>
      {error && <p className="error" role="alert">{error}</p>}
    </form>
  );
}
