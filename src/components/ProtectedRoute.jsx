import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, requireRole }) {
  const { session, role, loading } = useAuth();
  if (loading) return (
    <div className="flex h-screen items-center justify-center text-secondary">
      Loading…
    </div>
  );
  if (!session) return <Navigate to="/helpdesk/login" replace />;
  if (requireRole && role === null) return (
    <div className="flex h-screen items-center justify-center text-secondary">
      Loading…
    </div>
  );
  if (requireRole && role !== requireRole) return <Navigate to="/helpdesk/call" replace />;
  return children;
}
