import { useCallback, useEffect, useState } from "react";
import api, { errorMessage } from "../api";

const EMPTY_CANTEEN = { name: "", location: "", description: "" };
const EMPTY_STAFF = { name: "", email: "", phone: "", password: "", canteenId: "" };

export default function AdminPanel() {
  const [canteens, setCanteens] = useState([]);
  const [canteenForm, setCanteenForm] = useState(EMPTY_CANTEEN);
  const [staffForm, setStaffForm] = useState(EMPTY_STAFF);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api.get("/canteens");
      setCanteens(res.data);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createCanteen = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!canteenForm.name.trim()) {
      setError("Canteen name is required");
      return;
    }
    setBusy("canteen");
    try {
      const res = await api.post("/canteens", {
        name: canteenForm.name.trim(),
        location: canteenForm.location.trim(),
        description: canteenForm.description.trim(),
      });
      setMessage(`Canteen "${res.data.name}" created. Now create its owner login below.`);
      setCanteenForm(EMPTY_CANTEEN);
      setStaffForm((f) => ({ ...f, canteenId: res.data._id }));
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy("");
    }
  };

  const createStaff = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    const { name, email, phone, password, canteenId } = staffForm;
    if (!name.trim() || !email.trim() || !phone.trim() || !password || !canteenId) {
      setError("All owner fields and a canteen are required");
      return;
    }
    setBusy("staff");
    try {
      await api.post("/admin/staff", {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        canteenIds: [canteenId],
      });
      const c = canteens.find((x) => x._id === canteenId);
      setMessage(`Owner login created for ${c?.name}. Give them this email and password.`);
      setStaffForm(EMPTY_STAFF);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy("");
    }
  };

  return (
    <div>
      <h2>Admin</h2>
      {error && <p className="error">{error}</p>}
      {message && <p className="muted"><b>{message}</b></p>}

      <form className="card wide" onSubmit={createCanteen}>
        <h3>1. Register a canteen</h3>
        <label className="field">
          Name
          <input value={canteenForm.name} onChange={(e) => setCanteenForm({ ...canteenForm, name: e.target.value })} />
        </label>
        <label className="field">
          Location
          <input value={canteenForm.location} onChange={(e) => setCanteenForm({ ...canteenForm, location: e.target.value })} />
        </label>
        <label className="field">
          Description
          <input value={canteenForm.description} onChange={(e) => setCanteenForm({ ...canteenForm, description: e.target.value })} />
        </label>
        <button type="submit" disabled={busy === "canteen"}>
          {busy === "canteen" ? "Creating..." : "Create canteen"}
        </button>
      </form>

      <form className="card wide" onSubmit={createStaff}>
        <h3>2. Create an owner login</h3>
        <label className="field">
          Canteen
          <select value={staffForm.canteenId} onChange={(e) => setStaffForm({ ...staffForm, canteenId: e.target.value })}>
            <option value="">Select a canteen</option>
            {canteens.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Owner name
          <input value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} />
        </label>
        <label className="field">
          Email (their login)
          <input type="email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} />
        </label>
        <label className="field">
          Phone
          <input value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} />
        </label>
        <label className="field">
          Password (min 6 characters)
          <input value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} />
        </label>
        <button type="submit" disabled={busy === "staff"}>
          {busy === "staff" ? "Creating..." : "Create owner login"}
        </button>
      </form>
    </div>
  );
}