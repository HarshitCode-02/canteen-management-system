import { disconnectSocket } from "../socket";
import { createContext, useContext, useEffect, useState } from "react";
import api from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // The browser session is restored from the HttpOnly auth cookie.
  useEffect(() => {
    localStorage.removeItem("token");
    api
      .get("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // close the socket when logged out
  useEffect(() => {
    if (!user) disconnectSocket();
  }, [user]);


  const saveSession = (user) => {
    setUser(user);
    return user;
  };

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    return saveSession(res.data.user);
  };

  const register = async (form) => {
    const res = await api.post("/auth/register", form);
    return saveSession(res.data.user);
  };

  const logout = async () => {
    await api.post("/auth/logout");
    localStorage.removeItem("token");
    disconnectSocket();
    setUser(null);
  };

  const updateUser = (updatedUser) => setUser(updatedUser);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);