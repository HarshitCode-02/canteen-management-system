import { useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../api";

export default function MealSuggestions() {
  const [budget, setBudget] = useState("");
  const [maxItems, setMaxItems] = useState("3");
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await api.post("/smart/meal-suggestions", {
        budget: Number(budget),
        maxItems: Number(maxItems),
      });
      setSuggestions(result.data.suggestions);
    } catch (err) {
      setError(errorMessage(err));
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="smart-panel">
      <h2>Meals within your budget</h2>
      <p className="muted">Suggestions use current prices and available items from open canteens.</p>
      <form className="smart-form" onSubmit={submit}>
        <label className="field">
          Budget in rupees
          <input
            type="number"
            min="1"
            max="5000"
            step="0.01"
            required
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
          />
        </label>
        <label className="field">
          Maximum items
          <select value={maxItems} onChange={(event) => setMaxItems(event.target.value)}>
            {[1, 2, 3, 4].map((count) => <option key={count} value={count}>{count}</option>)}
          </select>
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Finding meals..." : "Suggest meals"}
        </button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
      {!loading && suggestions.length === 0 && !error && (
        <p className="muted">Enter a budget to see matching combinations.</p>
      )}
      <div className="smart-results">
        {suggestions.map((suggestion, index) => (
          <article className="smart-result" key={`${suggestion.canteen.id}-${index}`}>
            <h3>{suggestion.canteen.name} · ₹{suggestion.total.toFixed(2)}</h3>
            <ul>
              {suggestion.items.map((item) => (
                <li key={item.id}>{item.name} — ₹{item.price.toFixed(2)}</li>
              ))}
            </ul>
            <Link to={`/canteen/${suggestion.canteen.id}`}>View canteen menu</Link>
          </article>
        ))}
      </div>
      <p className="muted">Suggestions are not allergy or nutrition advice; allergen data is not maintained.</p>
    </section>
  );
}
