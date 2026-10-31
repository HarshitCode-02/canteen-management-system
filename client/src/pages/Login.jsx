import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const u = await login(email, password);
      navigate(u.role === "canteen" || u.role === "admin" ? "/dashboard" : "/");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <h2>Login</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password}
          onChange={(e) => setPassword(e.target.value)} required />
        <button disabled={busy}>{busy ? "Please wait..." : "Login"}</button>
      </form>
      <div className="login-links">
        <span>New here? <Link to="/register">Create an account</Link></span>
        <button
          className="link-button"
          type="button"
          aria-expanded={showRecovery}
          aria-controls="password-recovery"
          onClick={() => setShowRecovery((shown) => !shown)}
        >
          Forgot password?
        </button>
      </div>
      {showRecovery && (
        <div className="recovery-panel" id="password-recovery">
          <strong>Reset your password</strong>
          <p>Contact your app administrator and verify your identity. They can set a temporary password for you.</p>
          <p className="recovery-note">No reset email is sent. Never share your current password.</p>
        </div>
      )}
    </div>
  );
}