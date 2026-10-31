import { useEffect, useState } from "react";
import api, { errorMessage } from "../api";
import { disconnectSocket } from "../socket";
import { useAuth } from "../context/AuthContext";

export default function AccountSettings() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profile, setProfile] = useState(() => ({
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    rollNumber: user.rollNumber || "",
    department: user.department || "",
    year: user.year?.toString() || "",
    avatarUrl: user.avatarUrl || "",
  }));
  const [currentEmailPassword, setCurrentEmailPassword] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [managedCanteenNames, setManagedCanteenNames] = useState([]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get("/auth/me")
      .then((res) => {
        if (!cancelled) setManagedCanteenNames(res.data.managedCanteenNames || []);
      })
      .catch((err) => {
        if (!cancelled) setProfileError(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const beginEditing = () => {
    setProfile({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      rollNumber: user.rollNumber || "",
      department: user.department || "",
      year: user.year?.toString() || "",
      avatarUrl: user.avatarUrl || "",
    });
    setProfileError("");
    setProfileMessage("");
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setCurrentEmailPassword("");
    setProfileError("");
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileMessage("");
    setProfileSaving(true);
    try {
      const body = { ...profile };
      if (profile.email.trim().toLowerCase() !== user.email) {
        body.currentPassword = currentEmailPassword;
      }
      const res = await api.patch("/auth/me", body);
      updateUser(res.data.user);
      setProfile(res.data.user);
      setCurrentEmailPassword("");
      setEditing(false);
      setProfileMessage("Profile updated successfully");
    } catch (err) {
      setProfileError(errorMessage(err));
    } finally {
      setProfileSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setSaving(true);
    try {
      const res = await api.patch("/auth/password", { currentPassword, newPassword });
      disconnectSocket();
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setChangingPassword(false);
      setMessage(res.data.message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card account-card">
      <h2>Account settings</h2>
      <h3>Profile details</h3>
      {profileError && <p className="error" role="alert">{profileError}</p>}
      {profileMessage && <p className="ready-banner" role="status">{profileMessage}</p>}
      {user.avatarUrl && !editing && (
        <img className="account-avatar" src={user.avatarUrl} alt={`${user.name}'s avatar`} />
      )}
      {!editing ? (
        <div>
          <p><strong>Name:</strong> {user.name}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Phone:</strong> {user.phone}</p>
          <p><strong>Roll number:</strong> {user.rollNumber || "—"}</p>
          <p><strong>Department:</strong> {user.department || "—"}</p>
          <p><strong>Year:</strong> {user.year || "—"}</p>
          <p><strong>Role:</strong> <span className="badge">{user.role}</span></p>
          <p><strong>Member since:</strong> {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</p>
          {user.role === "student" && (
            <p><strong>Account status:</strong> {user.isBlocked ? "Blocked" : "Active"}</p>
          )}
          {(user.role === "canteen" || user.role === "admin") && (
            <p><strong>Managed canteens:</strong> {managedCanteenNames.join(", ") || "None"}</p>
          )}
          <div className="account-actions">
            <button type="button" onClick={beginEditing}>Edit details</button>
            <button type="button" className="small" onClick={() => {
              setChangingPassword((shown) => !shown);
              setError("");
              setMessage("");
            }}>
              {changingPassword ? "Cancel password change" : "Change password"}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={saveProfile}>
          <label className="field">
            Name
            <input required minLength="2" maxLength="50" value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </label>
          <label className="field">
            Email
            <input type="email" required autoComplete="email" value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
          </label>
          {profile.email.trim().toLowerCase() !== user.email && (
            <label className="field">
              Current password (to change email)
              <input type="password" autoComplete="current-password" required
                value={currentEmailPassword}
                onChange={(e) => setCurrentEmailPassword(e.target.value)} />
            </label>
          )}
          <label className="field">
            Phone
            <input type="tel" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength="10" required
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          </label>
          <label className="field">
            Roll number (optional)
            <input value={profile.rollNumber}
              onChange={(e) => setProfile({ ...profile, rollNumber: e.target.value })} />
          </label>
          <label className="field">
            Department (optional)
            <input value={profile.department}
              onChange={(e) => setProfile({ ...profile, department: e.target.value })} />
          </label>
          <label className="field">
            Year (optional)
            <select value={profile.year}
              onChange={(e) => setProfile({ ...profile, year: e.target.value })}>
              <option value="">Not set</option>
              {[1, 2, 3, 4, 5, 6].map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label className="field">
            Avatar URL (optional)
            <input type="url" placeholder="https://example.com/avatar.jpg"
              value={profile.avatarUrl}
              onChange={(e) => setProfile({ ...profile, avatarUrl: e.target.value })} />
          </label>
          <button type="submit" disabled={profileSaving}>
            {profileSaving ? "Saving..." : "Save"}
          </button>{" "}
          <button type="button" className="small" onClick={cancelEditing}>Cancel</button>
        </form>
      )}

      {message && <p className="ready-banner" role="status">{message}</p>}
      {changingPassword && (
        <div className="account-password">
          <h3>Change password</h3>
          <p className="muted">Choose a new sign-in password.</p>
          {error && <p className="error" role="alert">{error}</p>}
          <form onSubmit={changePassword}>
            <label className="field">
              Current password
              <input
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </label>
            <label className="field">
              New password
              <input
                type="password"
                autoComplete="new-password"
                minLength="6"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </label>
            <label className="field">
              Confirm new password
              <input
                type="password"
                autoComplete="new-password"
                minLength="6"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>
            <button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save new password"}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
