import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../api";

const signature = (item) => `${item.name.trim().toLocaleLowerCase()}|${item.category.trim().toLocaleLowerCase()}`;

export default function CanteenCompare() {
  const [canteens, setCanteens] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [menus, setMenus] = useState({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get("/canteens")
      .then((res) => {
        if (!active) return;
        setCanteens(res.data);
        setSelectedIds(res.data.slice(0, 3).map((canteen) => canteen._id));
      })
      .catch((err) => {
        if (active) setError(errorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (selectedIds.length === 0) {
      return () => { active = false; };
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- show loading while selected canteen menus are fetched
    setLoading(true);
    Promise.all(selectedIds.map((id) => api.get(`/canteens/${id}/menu`)))
      .then((responses) => {
        if (!active) return;
        setMenus(Object.fromEntries(responses.map((response) => [
          response.data.canteen._id,
          response.data.items,
        ])));
        setError("");
      })
      .catch((err) => {
        if (active) setError(errorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [selectedIds]);

  const toggleCanteen = (id) => {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      if (current.length >= 3) return current;
      return [...current, id];
    });
  };

  const rows = useMemo(() => {
    const groups = new Map();
    for (const canteenId of selectedIds) {
      for (const item of menus[canteenId] || []) {
        const key = signature(item);
        const group = groups.get(key) || { name: item.name, category: item.category, entries: {} };
        if (group.entries[canteenId]) {
          group.ambiguous = true;
        } else {
          group.entries[canteenId] = item;
        }
        groups.set(key, group);
      }
    }
    const term = search.trim().toLocaleLowerCase();
    return [...groups.values()]
      .filter((group) => !group.ambiguous && (!term || group.name.toLocaleLowerCase().includes(term)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [menus, search, selectedIds]);

  if (loading && canteens.length === 0) return <p role="status">Loading canteens...</p>;

  return (
    <section className="smart-panel">
      <h2>Compare canteens</h2>
      <p className="muted">Price rows match only exact item names and categories; availability is shown separately.</p>
      {error && <p className="error" role="alert">{error}</p>}
      <fieldset className="canteen-choices">
        <legend>Select up to three active canteens</legend>
        {canteens.map((canteen) => (
          <label key={canteen._id}>
            <input
              type="checkbox"
              checked={selectedIds.includes(canteen._id)}
              disabled={!selectedIds.includes(canteen._id) && selectedIds.length >= 3}
              onChange={() => toggleCanteen(canteen._id)}
            />
            {canteen.name}
          </label>
        ))}
      </fieldset>
      <label className="field">
        Filter item name
        <input value={search} onChange={(event) => setSearch(event.target.value)} />
      </label>
      {loading && <p role="status">Loading selected menus...</p>}
      {selectedIds.length < 2 && <p className="muted">Select at least two canteens to compare.</p>}
      {selectedIds.length >= 2 && !loading && rows.length === 0 && (
        <p className="muted">No matching menu items are available to compare.</p>
      )}
      {selectedIds.length >= 2 && rows.length > 0 && (
        <div className="comparison-scroll" role="region" aria-label="Canteen menu comparison" tabIndex="0">
          <table className="comparison-table">
            <thead>
              <tr>
                <th scope="col">Matching item</th>
                {selectedIds.map((id) => (
                  <th scope="col" key={id}>{canteens.find((canteen) => canteen._id === id)?.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={signature(row)}>
                  <th scope="row">{row.name}<span className="muted">{row.category}</span></th>
                  {selectedIds.map((id) => {
                    const item = row.entries[id];
                    return (
                      <td key={id}>
                        {item
                          ? <>{item.isAvailable ? "Available" : "Sold out"} · ₹{item.price}<br /><Link to={`/canteen/${id}`}>View menu</Link></>
                          : "Not on menu"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
