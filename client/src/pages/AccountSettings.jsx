import { useState } from "react";
import api, { errorMessage } from "../api";
import { disconnectSocket } from "../socket";

export default function AccountSettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

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
      localStorage.setItem("token", res.data.token);
      disconnectSocket();
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
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
      <p className="muted">Change your sign-in password.</p>
      {error && <p className="error" role="alert">{error}</p>}
      {message && <p className="ready-banner" role="status">{message}</p>}
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
          {saving ? "Saving..." : "Change password"}
        </button>
      </form>
    </section>
  );
}
