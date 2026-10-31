import axios from "axios";

// The same-origin Vercel rewrite proxies /api to the backend. VITE_API_URL is
// an optional override for local development or an explicitly separate API origin.
const apiBaseURL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
});

export const errorMessage = (err) =>
  err.response?.data?.message || "Something went wrong. Is the server running?";

export default api;
