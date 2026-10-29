import { io } from "socket.io-client";

// VITE_API_URL is usually ".../api"; the socket lives at the server root
const SOCKET_URL = (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "");

let socket = null;

// Safe to call many times: reuses the existing connection
export function connectSocket() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  if (!socket) socket = io(SOCKET_URL, { auth: { token } });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}