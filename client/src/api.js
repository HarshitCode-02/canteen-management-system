import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
});

export const errorMessage = (err) =>
  err.response?.data?.message || "Something went wrong. Is the server running?";

export default api;