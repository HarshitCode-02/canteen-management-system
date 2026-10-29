// Shows a dropdown only when the user can manage more than one canteen.
export default function CanteenSwitcher({ canteens, canteenId, onChange }) {
  if (canteens.length <= 1) return null;
  return (
    <label className="field">
      Canteen
      <select value={canteenId} onChange={(e) => onChange(e.target.value)}>
        {canteens.map((c) => (
          <option key={c._id} value={c._id}>{c.name}</option>
        ))}
      </select>
    </label>
  );
}