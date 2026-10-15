import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function GuestRoute() {
  const { customer, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <main className="loading-page">Loading...</main>;
  }

  if (customer) {
    const destination = location.state?.from?.pathname || "/products";
    return <Navigate to={destination} replace />;
  }

  return <Outlet />;
}
