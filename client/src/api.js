import axios from "axios";
import { errorMessage, errorMessages } from "./apiErrors";

// The same-origin Vercel rewrite proxies /api to the backend. VITE_API_URL is
// an optional override for local development or an explicitly separate API origin.
const apiBaseURL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
  timeout: 15000,
});

export { errorMessage, errorMessages };

export default api;
