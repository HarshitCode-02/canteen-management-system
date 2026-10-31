import { useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../api";

export default function MealSuggestions() {
  const [budget, setBudget] = useState("");
  const [maxItems, setMaxItems] = useState("3");
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (loading) return;
    const budgetValue = Number(budget);
    const maxItemsValue = Number(maxItems);
    if (!Number.isFinite(budgetValue) || budgetValue < 0.01 || budgetValue > 5000 || !/^\d+(?:\.\d{1,2})?$/.test(budget)) {
      setError("Enter a budget from ₹0.01 to ₹5,000 with no more than two decimal places.");
      setErrorField("budget");
      setSuggestions([]);
      return;
    }
    if (!Number.isInteger(maxItemsValue) || maxItemsValue < 1 || maxItemsValue > 4) {
      setError("Choose between 1 and 4 items.");
      setErrorField("items");
      setSuggestions([]);
      return;
    }

    setLoading(true);
    setError("");
    setErrorField("");
    setSubmitted(true);
    setSuggestions([]);
    try {
      const result = await api.post("/smart/meal-suggestions", {
        budget: budgetValue,
        maxItems: maxItemsValue,
      });
      setSuggestions(result.data.suggestions || []);
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
      <form className="smart-form" onSubmit={submit} noValidate>
        <label className="smart-field-label smart-budget-label" htmlFor="meal-budget">Budget (₹)</label>
        <input
          className="smart-field-control"
          id="meal-budget"
          type="number"
          min="0.01"
          max="5000"
          step="0.01"
          required
          inputMode="decimal"
          value={budget}
          placeholder="e.g. 150"
          aria-invalid={errorField === "budget"}
          aria-describedby={`meal-budget-help${errorField === "budget" ? " meal-suggestion-error" : ""}`}
          onChange={(event) => {
            setBudget(event.target.value);
            setError("");
            setErrorField("");
            setSuggestions([]);
            setSubmitted(false);
          }}
        />
        <span id="meal-budget-help" className="smart-field-help smart-budget-help muted">₹0.01–₹5,000, up to 2 decimal places</span>
        <label className="smart-field-label smart-items-label" htmlFor="meal-max-items">Max items</label>
        <select
          className="smart-field-control"
          id="meal-max-items"
          value={maxItems}
          aria-invalid={errorField === "items"}
          aria-describedby={`meal-max-items-help${errorField === "items" ? " meal-suggestion-error" : ""}`}
          onChange={(event) => {
            setMaxItems(event.target.value);
            setError("");
            setErrorField("");
            setSuggestions([]);
            setSubmitted(false);
          }}
        >
          {[1, 2, 3, 4].map((count) => <option key={count} value={count}>{count}</option>)}
        </select>
        <span id="meal-max-items-help" className="smart-field-help smart-items-help muted">Choose 1–4 items</span>
        <button className="smart-submit" type="submit" disabled={loading}>
          {loading ? "Finding meals..." : "Suggest meals"}
        </button>
      </form>
      {error && <p id="meal-suggestion-error" className="error" role="alert">{error}</p>}
      {!loading && !submitted && !error && (
        <p className="muted">Enter a budget to see matching combinations.</p>
      )}
      {!loading && submitted && suggestions.length === 0 && !error && (
        <p className="muted smart-empty" role="status">No available meal combinations fit that budget. Try increasing your budget or max items.</p>
      )}
      {loading && <p className="muted" role="status">Finding meals within your budget...</p>}
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
