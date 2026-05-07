import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthTokenGetter } from "@workspace/api-client-react";

interface AuthUser {
  id: number;
  name: string;
  mobile: string;
  referralCode: string;
  walletBalance: number;
  kycStatus: string;
  isBlocked: boolean;
}

interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, refreshToken: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setAuthTokenGetter(() => AsyncStorage.getItem("auth_token"));
    loadAuth();
  }, []);

  async function loadAuth() {
    try {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem("auth_token"),
        AsyncStorage.getItem("auth_user"),
      ]);
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }

  async function login(newToken: string, refreshToken: string, userData: AuthUser) {
    await Promise.all([
      AsyncStorage.setItem("auth_token", newToken),
      AsyncStorage.setItem("auth_refresh", refreshToken),
      AsyncStorage.setItem("auth_user", JSON.stringify(userData)),
    ]);
    setToken(newToken);
    setUser(userData);
  }

  async function logout() {
    await Promise.all([
      AsyncStorage.removeItem("auth_token"),
      AsyncStorage.removeItem("auth_refresh"),
      AsyncStorage.removeItem("auth_user"),
    ]);
    setToken(null);
    setUser(null);
  }

  function updateUser(partial: Partial<AuthUser>) {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      AsyncStorage.setItem("auth_user", JSON.stringify(updated));
      return updated;
    });
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
