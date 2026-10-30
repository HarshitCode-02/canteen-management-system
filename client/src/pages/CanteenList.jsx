import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../api";

export default function CanteenList() {
  const [canteens, setCanteens] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/canteens")
      .then((res) => setCanteens(res.data))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="center">Loading canteens...</p>;
  if (error) return <p className="error">{error}</p>;
  if (canteens.length === 0) return <p className="center">No canteens available right now.</p>;

  return (
    <div>
      <h2>Choose a canteen</h2>
      <div className="menu-grid">
        {canteens.map((c) => (
          <Link key={c._id} to={`/canteen/${c._id}`} className="canteen-card">
            <h3>{c.name}</h3>
            {c.rush && (
              <span className={`rush rush-${c.rush}`}>{c.rush} · ~{c.waitMins} min</span>
            )}
            {c.location && <p className="muted">{c.location}</p>}
            {c.description && <p className="muted">{c.description}</p>}
            <span className={`badge ${c.isOpen ? "open" : ""}`}>
              {c.isOpen ? "Open" : "Closed"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}