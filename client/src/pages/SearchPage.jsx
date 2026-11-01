import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api, { errorMessage, errorMessages } from "../api";
import CanteenLogo from "../components/CanteenLogo";
import FoodItemImage from "../components/FoodItemImage";
import { useAuth } from "../context/AuthContext";

const PAGES = [
  { title: "Home", to: "/", description: "Browse active campus canteens.", terms: "home canteen food" },
  { title: "Discover Meals", to: "/discover", description: "Get budget suggestions and compare canteens.", roles: ["student", "teacher"], terms: "discover meals budget compare" },
  { title: "Canteens", to: "/canteens", description: "See available canteens and their menus.", terms: "canteen menu" },
  { title: "My Orders", to: "/orders", description: "Track current and past orders.", terms: "orders status pickup history" },
  { title: "Cart", to: "/cart", description: "Review items and choose a pickup time.", terms: "cart checkout pickup" },
  { title: "Canteen Assistant", to: "/discover#canteen-assistant", description: "Ask about menus, prices, or your active order.", roles: ["student", "teacher"], terms: "assistant questions ask" },
  { title: "Dashboard", to: "/dashboard", description: "Review orders for your assigned canteen.", roles: ["canteen", "admin"], terms: "staff dashboard" },
  { title: "Manage Menu", to: "/manage-menu", description: "Update items and availability for your canteen.", roles: ["canteen", "admin"], terms: "staff menu items" },
  { title: "Blocked accounts", to: "/blocked", description: "Review no-show orders and account status.", roles: ["canteen", "admin"], terms: "blocked student review" },
  { title: "Sales Report", to: "/report", description: "Review canteen order and payment activity.", roles: ["canteen", "admin"], terms: "sales report" },
  { title: "Admin", to: "/admin", description: "Manage canteens and staff accounts.", roles: ["admin"], terms: "admin canteen staff" },
  { title: "Review moderation", to: "/admin/reviews", description: "Manage customer reviews.", roles: ["admin"], terms: "admin review" },
  { title: "Audit log", to: "/admin/audit-logs", description: "Review administrative and business events.", roles: ["admin"], terms: "admin audit history" },
];

const EMPTY_RESULTS = { canteens: [], items: [] };

export default function SearchPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const [results, setResults] = useState(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateQuery = (value) => {
    const params = new URLSearchParams();
    if (value) params.set("q", value);
    setSearchParams(params, { replace: true });
    setResults(EMPTY_RESULTS);
    setError("");
    setLoading(false);
  };

  useEffect(() => {
    const cleanQuery = urlQuery.trim();
    if (cleanQuery.length < 2) return undefined;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get("/search", {
          params: { q: cleanQuery },
          signal: controller.signal,
        });
        if (!Array.isArray(response.data?.canteens) || !Array.isArray(response.data?.items)) {
          throw new Error("Search returned an unexpected response");
        }
        setResults(response.data);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(errorMessage(requestError, errorMessages.search));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [urlQuery]);

  const pageResults = useMemo(() => {
    const normalized = urlQuery.trim().toLowerCase();
    if (!normalized) return [];
    return PAGES.filter((page) =>
      (!page.roles || page.roles.includes(user?.role))
      && `${page.title} ${page.description} ${page.terms}`.toLowerCase().includes(normalized)
    );
  }, [urlQuery, user?.role]);

  const hasQuery = urlQuery.trim().length >= 2;
  const hasResults = pageResults.length > 0 || results.canteens.length > 0 || results.items.length > 0;

  return (
    <div className="global-search">
      <header className="global-search-header">
        <h1>Search CampusBites</h1>
        <p className="muted">Find food, canteens, and pages available to your account.</p>
      </header>
      <form className="global-search-form" role="search" onSubmit={(event) => event.preventDefault()}>
        <label className="sr-only" htmlFor="global-search-input">Search food, canteens, or pages</label>
        <input
          id="global-search-input"
          type="search"
          autoComplete="off"
          maxLength={80}
          value={urlQuery}
          placeholder="Search food, canteens, or pages..."
          onChange={(event) => updateQuery(event.target.value)}
        />
        {urlQuery && (
          <button type="button" className="small" onClick={() => updateQuery("")}>
            Clear
          </button>
        )}
      </form>

      {urlQuery.trim().length === 1 && <p className="muted" role="status">Type at least 2 characters to search.</p>}
      {loading && <p className="muted" role="status">Searching...</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {hasQuery && !loading && !error && !hasResults && (
        <p className="search-empty" role="status">No results found. Try another search.</p>
      )}

      {pageResults.length > 0 && (
        <section className="search-results-section" aria-labelledby="search-pages-heading">
          <h2 id="search-pages-heading">Pages</h2>
          <div className="search-page-results">
            {pageResults.map((page) => (
              <Link className="search-page-result" key={page.to} to={page.to}>
                <span className="search-result-type">Page</span>
                <strong>{page.title}</strong>
                <span className="muted">{page.description}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {results.canteens.length > 0 && (
        <section className="search-results-section" aria-labelledby="search-canteens-heading">
          <h2 id="search-canteens-heading">Canteens</h2>
          <div className="search-entity-results">
            {results.canteens.map((canteen) => (
              <Link className="search-entity-result" key={canteen._id} to={`/canteen/${canteen._id}`}>
                <CanteenLogo key={`${canteen._id}:${canteen.logo || ""}`} className="search-canteen-logo" src={canteen.logo} name={canteen.name} />
                <span className="search-result-copy">
                  <span className="search-result-type">Canteen</span>
                  <strong>{canteen.name}</strong>
                  {canteen.location && <span className="muted">{canteen.location}</span>}
                </span>
                <span className={`badge ${canteen.isOpen ? "open" : ""}`}>{canteen.isOpen ? "Open" : "Closed"}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {results.items.length > 0 && (
        <section className="search-results-section" aria-labelledby="search-food-heading">
          <h2 id="search-food-heading">Food</h2>
          <div className="search-entity-results">
            {results.items.map((item) => (
              <Link className="search-entity-result" key={item._id} to={`/canteen/${item.canteen?._id || ""}`}>
                <FoodItemImage key={`${item._id}:${item.image || ""}`} className="search-food-image" src={item.image} alt={item.name} />
                <span className="search-result-copy">
                  <span className="search-result-type">Food · {item.category}</span>
                  <strong>{item.name}</strong>
                  <span className="muted">{item.canteen?.name || "Canteen"}</span>
                </span>
                <span className="search-result-meta">
                  <span className="search-result-price">₹{item.price}</span>
                  {item.canteen && (
                    <span className={`badge ${item.canteen.isOpen ? "open" : ""}`}>
                      {item.canteen.isOpen ? "Open" : "Closed"}
                    </span>
                  )}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
