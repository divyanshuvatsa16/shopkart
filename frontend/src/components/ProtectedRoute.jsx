import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { customer, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <main className="loading-page">Checking your session...</main>;
  }

  if (!customer) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
