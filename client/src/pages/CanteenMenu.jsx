import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { errorMessage } from "../api";
import { useCart } from "../context/CartContext";
import MenuItemReviews from "../components/MenuItemReviews";

export default function CanteenMenu() {
  const { id } = useParams();
  const { items: cart, canteen: cartCanteen, addItem, decrease, clearCart } = useCart();
  const [canteen, setCanteen] = useState(null);
  const [menu, setMenu] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingItem, setPendingItem] = useState(null);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("All");



  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- show loading instead of the previous canteen's menu
    setLoading(true);
    setError("");
    setPendingItem(null);
    api
      .get(`/canteens/${id}/menu`)
      .then((res) => {
        setCanteen(res.data.canteen);
        setMenu(res.data.items);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="center">Loading menu...</p>;
  if (error) {
    return (
      <div>
        <p className="error">{error}</p>
        <Link to="/">← All canteens</Link>
      </div>
    );
  }

  const categories = [...new Set(menu.map((m) => m.category))];
  const q = search.trim().toLowerCase();
  const visible = menu.filter(
    (m) =>
      (activeCat === "All" || m.category === activeCat) &&
      (!q || m.name.toLowerCase().includes(q))
  );
  const visibleCategories = categories.filter((c) => visible.some((m) => m.category === c));
  const qtyInCart = (itemId) => cart.find((i) => i.menuItemId === itemId)?.qty || 0;

  const handleAdd = (m) => {
    if (cart.length > 0 && cartCanteen && cartCanteen._id !== canteen._id) {
      setPendingItem(m); // ask before mixing canteens
      return;
    }
    addItem(m, canteen);
  };

  const switchCanteen = () => {
    clearCart();
    addItem(pendingItem, canteen);
    setPendingItem(null);
  };

  return (
    <div>
      <Link to="/" className="back-link">← All canteens</Link>
      <h1 className="canteen-title">{canteen.name}</h1>
      {canteen.location && <p className="muted">{canteen.location}</p>}
      {canteen.rush && (
        <p className={`rush rush-${canteen.rush}`}>
          {canteen.rush} · about {canteen.waitMins} min wait
        </p>
      )}
      {!canteen.isOpen && <p className="error">This canteen is closed right now.</p>}

      {pendingItem && (
        <div className="switch-banner">
          <p>
            Your cart has items from <b>{cartCanteen?.name}</b>. Clear it and start a
            new order from <b>{canteen.name}</b>?
          </p>
          <button onClick={switchCanteen}>Switch</button>
          <button className="small" onClick={() => setPendingItem(null)}>Keep my cart</button>
        </div>
      )}

      {menu.length === 0 && <p className="center">No items on the menu yet.</p>}

      {menu.length > 0 && (
        <>
          <input
            className="menu-search"
            placeholder="Search the menu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="chips">
            {["All", ...categories].map((c) => (
              <button
                key={c}
                className={`small chip ${activeCat === c ? "active" : ""}`}
                onClick={() => setActiveCat(c)}
              >
                {c}
              </button>
            ))}
          </div>
          {visible.length === 0 && <p className="muted">No items match your search.</p>}
        </>
      )}


      {visibleCategories.map((cat) => (
        <section key={cat}>
          <h2>{cat}</h2>
          <div className="menu-grid">
            {visible
              .filter((m) => m.category === cat)
              .map((m) => {
                const qty = qtyInCart(m._id);
                return (
                  <div key={m._id} className={`menu-item ${m.isAvailable ? "" : "soldout"}`}>
                    <div>
                      {m.image && (
                        <img
                          src={m.image}
                          alt={m.name}
                          className="menu-img"
                          loading="lazy"
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                      )}

                      <h3>{m.name}</h3>
                      {(m.isSpecial || m.isPopular) && (
                        <p>
                          {m.isSpecial && <span className="badge special">Today's special</span>}{" "}
                          {m.isPopular && <span className="badge popular">Popular</span>}
                        </p>
                      )}
                      <p className="price">₹{m.price}</p>
                      <p className="muted" aria-label={m.rating?.count ? `Average rating ${m.rating.average} out of 5 from ${m.rating.count} reviews` : "No ratings yet"}>
                        {m.rating?.count ? `★ ${m.rating.average}/5 (${m.rating.count})` : "No ratings yet"}
                      </p>
                      <p className="muted">~{m.prepTimeMins} min</p>
                      <MenuItemReviews itemId={m._id} />
                    </div>
                    {!m.isAvailable ? (
                      <span className="badge">Sold out</span>
                    ) : qty === 0 ? (
                      <button onClick={() => handleAdd(m)}>Add</button>
                    ) : (
                      <div className="stepper">
                        <button className="small" onClick={() => decrease(m._id)}>−</button>
                        <b>{qty}</b>
                        <button className="small" onClick={() => handleAdd(m)}>+</button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}