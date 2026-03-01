import { Navigate } from "react-router-dom";
import { useAdminAuthStore } from "./stores/useAdminAuthStore";
import type { JSX } from "react";
import { Spinner } from "./components/ui/spinner";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAdminAuthStore();

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner className="size-12 text-primary" />
    </div>
  )

  if (!user) return (
  <Navigate to="/login" replace />
  )

  return children;
}
