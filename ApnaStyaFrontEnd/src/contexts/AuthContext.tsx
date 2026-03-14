import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { getStoredUser, logout as apiLogout } from "@/lib/api";

interface AuthUser {
  username: string;
  roles: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
  isAdmin: boolean;
  isOwner: boolean;
  isBroker: boolean;
  isTenant: boolean;
  dashboardPath: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());

  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener("apnastay:auth:401", handler);
    return () => window.removeEventListener("apnastay:auth:401", handler);
  }, []);

  const logout = () => {
    apiLogout();
    setUser(null);
  };

  const roles = user?.roles ?? [];
  const isAdmin = roles.some(r => r.toLowerCase().includes("admin"));
  const isOwner = roles.some(r => r.toLowerCase().includes("owner"));
  const isBroker = roles.some(r => r.toLowerCase().includes("broker"));
  const isTenant = !isAdmin && !isOwner && !isBroker;

  const dashboardPath = isAdmin
    ? "/admin"
    : isOwner
    ? "/owner/dashboard"
    : isBroker
    ? "/broker/dashboard"
    : "/dashboard";

  return (
    <AuthContext.Provider value={{ user, setUser, logout, isAdmin, isOwner, isBroker, isTenant, dashboardPath }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
