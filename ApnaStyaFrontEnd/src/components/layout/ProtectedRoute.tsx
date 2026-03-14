import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoData } from "@/features/demo/DemoDataContext";

/**
 * When demo mode is OFF, dashboard routes require authentication.
 * Unauthenticated users are redirected to homepage.
 */
export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { demoMode } = useDemoData();
  const location = useLocation();

  if (!demoMode && !user) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};
