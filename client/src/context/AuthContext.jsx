import { disconnectSocket } from "../socket";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../api";

const AuthContext = createContext(null);

async function fetchSession() {
  try {
    const res = await api.get("/auth/me");
    return { user: res.data.user, error: "" };
  } catch (err) {
    return {
      user: null,
      error: err.response?.status === 401
        ? ""
        : "Unable to verify your session. Check your connection and try again.",
    };
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState("");

  const restoreSession = useCallback(async () => {
    setLoading(true);
    setSessionError("");
    const session = await fetchSession();
    setUser(session.user);
    setSessionError(session.error);
    setLoading(false);
  }, []);

  // The browser session is restored from the HttpOnly auth cookie.
  useEffect(() => {
    localStorage.removeItem("token");
    let active = true;
    fetchSession().then((session) => {
      if (!active) return;
      setUser(session.user);
      setSessionError(session.error);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  // close the socket when logged out
  useEffect(() => {
    if (!user) disconnectSocket();
  }, [user]);


  const saveSession = (user) => {
    setSessionError("");
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
    setSessionError("");
  };

  const updateUser = (updatedUser) => setUser(updatedUser);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      sessionError,
      restoreSession,
      login,
      register,
      logout,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);