import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../api";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(form);
      navigate("/");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <h2>Create account</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <input placeholder="Full name" value={form.name} onChange={set("name")} required />
        <input type="email" placeholder="Email" value={form.email} onChange={set("email")} required />
        <input type="tel" placeholder="Phone" value={form.phone} onChange={set("phone")} required />
        <input type="password" placeholder="Password (min 6 characters)" value={form.password}
          onChange={set("password")} minLength={6} required />
        <button disabled={busy}>{busy ? "Please wait..." : "Register"}</button>
      </form>
      <p>Already have an account? <Link to="/login">Login</Link></p>
    </div>
  );
}