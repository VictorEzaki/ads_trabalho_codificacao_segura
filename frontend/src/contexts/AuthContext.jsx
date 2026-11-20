import { createContext, useState, useEffect, useCallback } from "react";
import { authService } from "../services/authService";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const data = await authService.me();
        if (active) {
          setUser(data.user || null);
        }
      } catch {
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    function handleUnauthorized() {
      setUser(null);
    }

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    loadSession();

    return () => {
      active = false;
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authService.login({ email, password });
    setUser(data.user || null);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Mesmo que o backend retorne erro (ex: sessão já expirada), limpa o estado local
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        authenticated: Boolean(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
