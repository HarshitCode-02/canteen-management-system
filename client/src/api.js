import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

// attach the JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const errorMessage = (err) =>
  err.response?.data?.message || "Something went wrong. Is the server running?";

export default api;