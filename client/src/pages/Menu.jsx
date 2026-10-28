import { useEffect, useState } from "react";
import api, { errorMessage } from "../api";
import { useCart } from "../context/CartContext";

export default function Menu() {
  const { items: cart, addItem, decrease } = useCart();
  const [menu, setMenu] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/menu")
      .then((res) => setMenu(res.data))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="center">Loading menu...</p>;
  if (error) return <p className="error">{error}</p>;

  const categories = [...new Set(menu.map((m) => m.category))];
  const qtyInCart = (id) => cart.find((i) => i.menuItemId === id)?.qty || 0;

  return (
    <div>
      {categories.map((cat) => (
        <section key={cat}>
          <h2>{cat}</h2>
          <div className="menu-grid">
            {menu
              .filter((m) => m.category === cat)
              .map((m) => {
                const qty = qtyInCart(m._id);
                return (
                  <div key={m._id} className={`menu-item ${m.isAvailable ? "" : "soldout"}`}>
                    <div>
                      <h3>{m.name}</h3>
                      <p className="price">₹{m.price}</p>
                      <p className="muted">~{m.prepTimeMins} min</p>
                    </div>
                    {!m.isAvailable ? (
                      <span className="badge">Sold out</span>
                    ) : qty === 0 ? (
                      <button onClick={() => addItem(m)}>Add</button>
                    ) : (
                      <div className="stepper">
                        <button className="small" onClick={() => decrease(m._id)}>−</button>
                        <b>{qty}</b>
                        <button className="small" onClick={() => addItem(m)}>+</button>
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