import axios from "axios";

// The frontend and API are deployed as separate Vercel projects.
// In production, VITE_API_URL must point to the backend's /api base path.
// Locally, fall back to the Vite proxy at /api.
const apiBaseURL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
});

export const errorMessage = (err) =>
  err.response?.data?.message || "Something went wrong. Is the server running?";

export default api;
