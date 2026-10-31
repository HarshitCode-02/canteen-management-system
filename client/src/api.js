import axios from "axios";

const apiBaseURL = import.meta.env.PROD
  ? "/api"
  : import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
});

export const errorMessage = (err) =>
  err.response?.data?.message || "Something went wrong. Is the server running?";

export default api;