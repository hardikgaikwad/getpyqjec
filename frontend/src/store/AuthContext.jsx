import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { API_BASE } from "../config";

const AuthContext = createContext({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  updateVerificationStatus: () => {},
  refreshVerificationStatus: async () => {},
  isLoggedIn: false,
  isVerified: false,
  isAdmin: false,
});

export function AuthProvider({ children }) {
  // Restore synchronously so protected pages don't flash "log in first" on reload.
  const [token, setToken] = useState(() =>
    localStorage.getItem("user") ? localStorage.getItem("access_token") : null
  );
  const [user, setUser] = useState(() => {
    if (!localStorage.getItem("access_token")) return null;
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleAuthLogout = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener("auth:logout", handleAuthLogout);
    return () => window.removeEventListener("auth:logout", handleAuthLogout);
  }, []);

  function login(accessToken, userData) {
    setToken(accessToken);
    setUser(userData);
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("user", JSON.stringify(userData));
  }

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/auth/logout/`, {
        method: "POST",
        credentials: "include", // sends the refresh_token cookie
      });
    } catch (err) {
      console.error("Logout API failed:", err);
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
  }, []);

  const updateVerificationStatus = useCallback((newStatus) => {
    setUser((prevUser) => {
      if (!prevUser) return prevUser;
      const updated = { ...prevUser, verification_status: newStatus };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const refreshVerificationStatus = useCallback(async () => {
    const currentToken = localStorage.getItem("access_token");
    if (!currentToken) return;

    try {
      const res = await fetch(`${API_BASE}/verification/status/`, {
        headers: { Authorization: `Bearer ${currentToken}` },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.status) {
          updateVerificationStatus(data.status);
          return data;
        }
      }
    } catch (err) {
      console.error("Failed to refresh verification status:", err);
    }
  }, [updateVerificationStatus]);

  const isVerified = user?.verification_status === "verified";
  const isAdmin = user?.role === "admin" || !!user?.is_staff || !!user?.is_superuser;


  const value = {
    user,
    token,
    login,
    logout,
    updateVerificationStatus,
    refreshVerificationStatus,
    isLoggedIn: !!token,
    isVerified,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
