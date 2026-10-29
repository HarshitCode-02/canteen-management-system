import { useCallback, useEffect, useState } from "react";
import api, { errorMessage } from "../api";

const EMPTY_FORM = { name: "", price: "", category: "", prepTimeMins: 10 };

export default function ManageMenu() {
  const [menu, setMenu] = useState([]);
  const [drafts, setDrafts] = useState({}); // id -> price being typed
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/menu");
      setMenu(res.data);
      setError("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = async (id, changes) => {
    setBusyId(id);
    setError("");
    try {
      const res = await api.patch(`/menu/${id}`, changes);
      setMenu((prev) => prev.map((m) => (m._id === id ? res.data : m)));
      setDrafts((prev) => {
        const { [id]: _removed, ...rest } = prev;
        return rest;
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const savePrice = (item) => {
    const price = Number(drafts[item._id]);
    if (!Number.isFinite(price) || price < 0) {
      setError("Enter a valid price");
      return;
    }
    update(item._id, { price });
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete ${item.name} from the menu?`)) return;
    setBusyId(item._id);
    try {
      await api.delete(`/menu/${item._id}`);
      setMenu((prev) => prev.filter((m) => m._id !== item._id));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const addItem = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/menu", {
        name: form.name,
        price: Number(form.price),
        category: form.category,
        prepTimeMins: Number(form.prepTimeMins) || 10,
      });
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const setField = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  if (loading) return <p className="center">Loading menu...</p>;

  const categories = [...new Set(menu.map((m) => m.category))];

  return (
    <div>
      <h2>Manage menu</h2>
      {error && <p className="error">{error}</p>}

      <form className="add-form" onSubmit={addItem}>
        <input placeholder="Item name" value={form.name} onChange={setField("name")} required />
        <input type="number" min="0" placeholder="Price ₹" value={form.price}
          onChange={setField("price")} required />
        <input list="cats" placeholder="Category" value={form.category}
          onChange={setField("category")} required />
        <datalist id="cats">
          {categories.map((c) => <option key={c} value={c} />)}
        </datalist>
        <input type="number" min="0" placeholder="Prep mins" value={form.prepTimeMins}
          onChange={setField("prepTimeMins")} />
        <button>Add item</button>
      </form>

      {menu.length === 0 && <p className="muted">No items yet. Add your first one above.</p>}

      {categories.map((cat) => (
        <section key={cat}>
          <h3>{cat}</h3>
          {menu
            .filter((m) => m.category === cat)
            .map((m) => {
              const draft = drafts[m._id];
              const changed = draft !== undefined && Number(draft) !== m.price;
              const busy = busyId === m._id;
              return (
                <div key={m._id} className={`manage-row ${m.isAvailable ? "" : "soldout"}`}>
                  <b className="manage-name">{m.name}</b>
                  <div className="price-edit">
                    ₹
                    <input
                      type="number"
                      min="0"
                      value={draft ?? m.price}
                      onChange={(e) => setDrafts({ ...drafts, [m._id]: e.target.value })}
                    />
                    {changed && (
                      <button className="small" disabled={busy} onClick={() => savePrice(m)}>
                        Save
                      </button>
                    )}
                  </div>
                  <button
                    className={`small ${m.isAvailable ? "" : "ok"}`}
                    disabled={busy}
                    onClick={() => update(m._id, { isAvailable: !m.isAvailable })}
                  >
                    {m.isAvailable ? "Mark sold out" : "Mark available"}
                  </button>
                  <button className="small danger" disabled={busy} onClick={() => remove(m)}>
                    ✕
                  </button>
                </div>
              );
            })}
        </section>
      ))}
    </div>
  );
}