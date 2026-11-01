import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import CanteenAssistant from "../components/CanteenAssistant";
import CanteenCompare from "../components/CanteenCompare";
import MealSuggestions from "../components/MealSuggestions";

export default function Discover() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" });
  }, [hash]);

  return (
    <div className="discover-page">
      <header className="discover-hero">
        <p className="discover-eyebrow">CampusBites · Explore</p>
        <h1>Find your next campus meal</h1>
        <p>Make a meal plan for your budget, compare canteen menus, or ask about what is available right now.</p>
        <nav className="discover-shortcuts" aria-label="Discover tools">
          <a href="#budget-meals">Budget meals</a>
          <a href="#compare-canteens">Compare canteens</a>
          <a href="#canteen-assistant">Ask the assistant</a>
        </nav>
      </header>
      <div className="discover-tools">
        <div id="budget-meals" className="discover-tool"><MealSuggestions /></div>
        <div id="compare-canteens" className="discover-tool"><CanteenCompare /></div>
        <div id="canteen-assistant" className="discover-tool"><CanteenAssistant /></div>
      </div>
    </div>
  );
}
