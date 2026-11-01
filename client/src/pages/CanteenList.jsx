import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../api";

export default function CanteenList() {
  const [canteens, setCanteens] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const loadCanteens = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/canteens");
      if (!Array.isArray(response.data)) throw new Error("Unexpected canteen response");
      setCanteens(response.data);
    } catch (err) {
      setError(errorMessage(err, {
        fallback: "We couldn't load canteens right now. Please try again.",
        network: "We couldn't load canteens right now. Please try again.",
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch canteen cards on mount and explicit retry
    void loadCanteens();
  }, [loadCanteens, reloadKey]);

  if (loading) return <p className="center">Loading canteens...</p>;
  if (error) {
    return (
      <div className="page-error">
        <p className="error" role="alert">{error}</p>
        <button type="button" onClick={() => setReloadKey((key) => key + 1)}>Try again</button>
      </div>
    );
  }
  if (canteens.length === 0) return <p className="center">No canteens available right now.</p>;

  return (
    <div>
      <h2>Choose a canteen</h2>
      <div className="menu-grid">
        {canteens.map((c) => (
          <Link key={c._id} to={`/canteen/${c._id}`} className="canteen-card">
            <CanteenCardLogo key={c.logo || "default-logo"} logo={c.logo} />
            <div className="canteen-card-content">
              <div className="canteen-card-heading">
                <h3>{c.name}</h3>
                <span className={`badge ${c.isOpen ? "open" : ""}`}>
                  {c.isOpen ? "Open" : "Closed"}
                </span>
              </div>
              {c.rush && (
                <span className={`rush rush-${c.rush}`}>{c.rush} · ~{c.waitMins} min</span>
              )}
              {c.location && <p className="muted">{c.location}</p>}
              {c.description && <p className="muted">{c.description}</p>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function CanteenCardLogo({ logo }) {
  const [failed, setFailed] = useState(false);

  if (!logo || failed) {
    return (
      <div className="canteen-card-image canteen-card-image-fallback" aria-hidden="true">
        <img src="/pwa-icon.svg" alt="" />
        <span>CampusBites</span>
      </div>
    );
  }

  return (
    <div className="canteen-card-image">
      <img
        src={logo}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
}