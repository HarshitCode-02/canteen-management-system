import CanteenAssistant from "../components/CanteenAssistant";
import CanteenCompare from "../components/CanteenCompare";
import MealSuggestions from "../components/MealSuggestions";

export default function Discover() {
  return (
    <div className="discover-page">
      <h1>Discover</h1>
      <MealSuggestions />
      <CanteenCompare />
      <CanteenAssistant />
    </div>
  );
}
