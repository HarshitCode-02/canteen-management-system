import { useCallback, useEffect, useState } from "react";
import api, { errorMessage } from "../api";

const EMPTY_CANTEEN = { name: "", location: "", description: "" };
const EMPTY_STAFF = { name: "", email: "", phone: "", password: "", canteenId: "" };
const EMPTY_RESET = { email: "", newPassword: "" };

export default function AdminPanel() {
  const [canteens, setCanteens] = useState([]);
  const [owners, setOwners] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [canteenEdits, setCanteenEdits] = useState({});
  const [ownerPasswords, setOwnerPasswords] = useState({});
  const [resetForm, setResetForm] = useState(EMPTY_RESET);
  const [canteenForm, setCanteenForm] = useState(EMPTY_CANTEEN);
  const [staffForm, setStaffForm] = useState(EMPTY_STAFF);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/admin/overview");
      setCanteens(res.data.canteens);
      setOwners(res.data.owners);
      setBlockedUsers(res.data.blockedUsers);
      setCanteenEdits(
        Object.fromEntries(
          res.data.canteens.map((canteen) => [
            canteen._id,
            {
              name: canteen.name,
              location: canteen.location || "",
              description: canteen.description || "",
              logo: canteen.logo || "",
              slotLimit: canteen.slotLimit,
              avgPrepMins: canteen.avgPrepMins,
              isActive: canteen.isActive,
            },
          ])
        )
      );
      setError("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
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
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy("");
    }
  };

  const saveCanteen = async (e, canteenId) => {
    e.preventDefault();
    const edit = canteenEdits[canteenId];
    if (!edit.name.trim()) {
      setError("Canteen name is required");
      return;
    }

    setBusy(`canteen:${canteenId}`);
    setError("");
    setMessage("");
    try {
      await api.patch(`/canteens/${canteenId}`, {
        ...edit,
        name: edit.name.trim(),
        location: edit.location.trim(),
        description: edit.description.trim(),
        logo: edit.logo.trim(),
        slotLimit: Number(edit.slotLimit),
        avgPrepMins: Number(edit.avgPrepMins),
      });
      setMessage("Canteen details saved.");
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy("");
    }
  };

  const unblockUser = async (user) => {
    if (!window.confirm(`Unblock ${user.name} and reset their no-show count? Confirm that staff recorded payment for every no-show order first.`)) return;
    setBusy(`unblock:${user._id}`);
    setError("");
    setMessage("");
    try {
      await api.patch(`/admin/users/${user._id}/unblock`);
      setMessage(`${user.name} has been unblocked.`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy("");
    }
  };

  const resetOwnerPassword = async (owner) => {
    const newPassword = ownerPasswords[owner._id] || "";
    if (newPassword.length < 6) {
      setError("Temporary password must be at least 6 characters");
      return;
    }
    if (!window.confirm(`Reset ${owner.name}'s password? Their current sessions will be signed out.`)) {
      return;
    }

    setBusy(`password:${owner._id}`);
    setError("");
    setMessage("");
    try {
      const res = await api.patch(`/admin/users/${owner._id}/password`, { newPassword });
      setMessage(res.data.message);
      setOwnerPasswords((current) => ({ ...current, [owner._id]: "" }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy("");
    }
  };

  const resetAccountPassword = async (e) => {
    e.preventDefault();
    if (resetForm.newPassword.length < 6) {
      setError("Temporary password must be at least 6 characters");
      return;
    }
    if (!window.confirm(`Reset the password for ${resetForm.email.trim()}? Their current sessions will be signed out.`)) {
      return;
    }

    setBusy("password:account");
    setError("");
    setMessage("");
    try {
      const res = await api.patch("/admin/users/password", {
        email: resetForm.email.trim(),
        newPassword: resetForm.newPassword,
      });
      setMessage(res.data.message);
      setResetForm(EMPTY_RESET);
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
      {loading && <p className="center">Loading admin data...</p>}

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

      <section>
        <h3>Canteens</h3>
        {!loading && canteens.length === 0 && <p className="muted">No canteens yet.</p>}
        <div className="admin-grid">
          {canteens.map((canteen) => {
            const edit = canteenEdits[canteen._id];
            if (!edit) return null;
            return (
              <form
                className="admin-card"
                key={canteen._id}
                onSubmit={(e) => saveCanteen(e, canteen._id)}
              >
                <h4>{canteen.name}</h4>
                <label className="field">
                  Name
                  <input value={edit.name} onChange={(e) => setCanteenEdits((all) => ({
                    ...all,
                    [canteen._id]: { ...all[canteen._id], name: e.target.value },
                  }))} />
                </label>
                <label className="field">
                  Location
                  <input value={edit.location} onChange={(e) => setCanteenEdits((all) => ({
                    ...all,
                    [canteen._id]: { ...all[canteen._id], location: e.target.value },
                  }))} />
                </label>
                <label className="field">
                  Description
                  <input value={edit.description} onChange={(e) => setCanteenEdits((all) => ({
                    ...all,
                    [canteen._id]: { ...all[canteen._id], description: e.target.value },
                  }))} />
                </label>
                <label className="field">
                  Logo URL
                  <input type="url" value={edit.logo} onChange={(e) => setCanteenEdits((all) => ({
                    ...all,
                    [canteen._id]: { ...all[canteen._id], logo: e.target.value },
                  }))} />
                </label>
                <div className="admin-number-fields">
                  <label className="field">
                    Slot limit
                    <input type="number" min="1" value={edit.slotLimit} onChange={(e) => setCanteenEdits((all) => ({
                      ...all,
                      [canteen._id]: { ...all[canteen._id], slotLimit: e.target.value },
                    }))} />
                  </label>
                  <label className="field">
                    Prep minutes
                    <input type="number" min="0" value={edit.avgPrepMins} onChange={(e) => setCanteenEdits((all) => ({
                      ...all,
                      [canteen._id]: { ...all[canteen._id], avgPrepMins: e.target.value },
                    }))} />
                  </label>
                </div>
                <label className="admin-toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(edit.isActive)}
                    onChange={(e) => setCanteenEdits((all) => ({
                      ...all,
                      [canteen._id]: { ...all[canteen._id], isActive: e.target.checked },
                    }))}
                  />
                  Canteen is active and visible
                </label>
                <button type="submit" disabled={busy === `canteen:${canteen._id}`}>
                  {busy === `canteen:${canteen._id}` ? "Saving..." : "Save canteen"}
                </button>
              </form>
            );
          })}
        </div>
      </section>

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
          <input type="password" value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} />
        </label>
        <button type="submit" disabled={busy === "staff"}>
          {busy === "staff" ? "Creating..." : "Create owner login"}
        </button>
      </form>

      <form className="card wide" onSubmit={resetAccountPassword}>
        <h3>Reset an account password</h3>
        <p className="muted">Verify the person's identity outside the app before resetting.</p>
        <label className="field">
          Account email
          <input
            type="email"
            required
            value={resetForm.email}
            onChange={(e) => setResetForm({ ...resetForm, email: e.target.value })}
          />
        </label>
        <label className="field">
          Temporary password (min 6 characters)
          <input
            type="password"
            minLength="6"
            required
            autoComplete="new-password"
            value={resetForm.newPassword}
            onChange={(e) => setResetForm({ ...resetForm, newPassword: e.target.value })}
          />
        </label>
        <button type="submit" disabled={busy === "password:account"}>
          {busy === "password:account" ? "Resetting..." : "Reset account password"}
        </button>
      </form>

      <section>
        <h3>Canteen owners</h3>
        {owners.length === 0 ? (
          <p className="muted">No owner accounts yet.</p>
        ) : (
          <div className="admin-grid">
            {owners.map((owner) => (
              <article className="admin-card" key={owner._id}>
                <h4>{owner.name}</h4>
                <p><a href={`mailto:${owner.email}`}>{owner.email}</a></p>
                {owner.phone && <p>{owner.phone}</p>}
                <p className="muted">
                  {(owner.managedCanteens || []).map((c) => c.name).join(", ") || "No canteen assigned"}
                </p>
                <label className="field">
                  Temporary password
                  <input
                    type="password"
                    minLength="6"
                    autoComplete="new-password"
                    value={ownerPasswords[owner._id] || ""}
                    onChange={(e) => setOwnerPasswords((current) => ({
                      ...current,
                      [owner._id]: e.target.value,
                    }))}
                  />
                </label>
                <button
                  type="button"
                  disabled={busy === `password:${owner._id}`}
                  onClick={() => resetOwnerPassword(owner)}
                >
                  {busy === `password:${owner._id}` ? "Resetting..." : "Reset password"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3>Blocked students and teachers</h3>
        {blockedUsers.length === 0 ? (
          <p className="muted">No blocked accounts.</p>
        ) : (
          <div className="admin-grid">
            {blockedUsers.map((blocked) => (
              <article className="admin-card" key={blocked._id}>
                <h4>{blocked.name}</h4>
                <p>{blocked.email}</p>
                <p className="muted">No-shows: {blocked.noShowCount}</p>
                <button
                  type="button"
                  disabled={busy === `unblock:${blocked._id}`}
                  onClick={() => unblockUser(blocked)}
                >
                  {busy === `unblock:${blocked._id}` ? "Unblocking..." : "Unblock account"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}