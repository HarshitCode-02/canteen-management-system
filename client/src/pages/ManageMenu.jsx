import { useCallback, useEffect, useState } from "react";
import api, { errorMessage } from "../api";
import useStaffCanteen from "../useStaffCanteen";
import CanteenSwitcher from "../components/CanteenSwitcher";

const EMPTY_FORM = { name: "", price: "", category: "", prepTimeMins: 10 };

export default function ManageMenu() {
  const [menu, setMenu] = useState([]);
  const [drafts, setDrafts] = useState({}); // id -> price being typed
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const { canteens, canteen, canteenId, setCanteenId, error: canteenError } = useStaffCanteen();

  const load = useCallback(async () => {
    if (!canteenId) return;
    try {
      const res = await api.get("/menu", { params: { canteen: canteenId } });
      setMenu(res.data);
      setError("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [canteenId]);

  useEffect(() => {
    setMenu([]);
    setDrafts({});
    setLoading(true);
    load();
  }, [load]);

  const replaceItem = (updated) =>
    setMenu((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));

  const patchItem = async (item, changes) => {
    setBusyId(item._id);
    setError("");
    try {
      const res = await api.patch(`/menu/${item._id}`, changes);
      replaceItem(res.data);
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const toggleAvailable = (item) => patchItem(item, { isAvailable: !item.isAvailable });

  const savePrice = async (item) => {
    const price = Number(drafts[item._id]);
    if (!Number.isFinite(price) || price < 0) {
      setError("Enter a valid price");
      return;
    }
    const ok = await patchItem(item, { price });
    if (ok) {
      setDrafts((d) => {
        const copy = { ...d };
        delete copy[item._id];
        return copy;
      });
    }
  };

  const removeItem = async (item) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    setBusyId(item._id);
    setError("");
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
    const price = Number(form.price);
    if (!form.name.trim() || !form.category.trim() || !Number.isFinite(price) || price < 0) {
      setError("Name, category and a valid price are required");
      return;
    }
    setBusyId("new");
    try {
      const res = await api.post("/menu", {
        canteen: canteenId,
        name: form.name.trim(),
        category: form.category.trim(),
        price,
        prepTimeMins: Number(form.prepTimeMins) || 10,
      });
      setMenu((prev) => [...prev, res.data]);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  if (canteenError) return <p className="error">{canteenError}</p>;
  if (loading) return <p className="center">Loading menu...</p>;

  const sorted = [...menu].sort(
    (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
  );

  return (
    <div>
      <h2>{canteen?.name} menu</h2>
      <CanteenSwitcher canteens={canteens} canteenId={canteenId} onChange={setCanteenId} />

      {error && <p className="error">{error}</p>}

      <form className="card wide" onSubmit={addItem}>
        <h3>Add item</h3>
        <label className="field">
          Name
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="field">
          Category
          <input
            value={form.category}
            placeholder="Snacks, Meals, Beverages..."
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
        </label>
        <label className="field">
          Price (₹)
          <input
            type="number"
            min="0"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
        </label>
        <label className="field">
          Prep time (minutes)
          <input
            type="number"
            min="0"
            value={form.prepTimeMins}
            onChange={(e) => setForm({ ...form, prepTimeMins: e.target.value })}
          />
        </label>
        <button type="submit" disabled={busyId === "new"}>
          {busyId === "new" ? "Adding..." : "Add item"}
        </button>
      </form>

      {sorted.length === 0 ? (
        <p className="muted">No items yet. Add your first item above.</p>
      ) : (
        <div className="menu-grid">
          {sorted.map((m) => {
            const busy = busyId === m._id;
            const draft = drafts[m._id];
            const editing = draft !== undefined && String(draft) !== String(m.price);
            return (
              <div key={m._id} className={`menu-item ${m.isAvailable ? "" : "soldout"}`}>
                <div>
                  <h3>{m.name}</h3>
                  <p className="muted">{m.category} · ~{m.prepTimeMins} min</p>
                  <label className="field">
                    Price (₹)
                    <input
                      type="number"
                      min="0"
                      value={draft !== undefined ? draft : m.price}
                      onChange={(e) => setDrafts({ ...drafts, [m._id]: e.target.value })}
                    />
                  </label>
                </div>
                <div className="dash-actions">
                  {editing && (
                    <button className="small" disabled={busy} onClick={() => savePrice(m)}>
                      Save price
                    </button>
                  )}
                  <button className="small" disabled={busy} onClick={() => toggleAvailable(m)}>
                    {m.isAvailable ? "Mark sold out" : "Mark available"}
                  </button>
                  <button className="small danger" disabled={busy} onClick={() => removeItem(m)}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}