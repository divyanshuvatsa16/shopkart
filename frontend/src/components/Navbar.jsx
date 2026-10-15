import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const navigate = useNavigate();
  const { customer, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const { cartCount } = useCart();

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="clinical-header navbar">
      <div className="clinical-logo-wrap">
        <Link className="clinical-logo brand hover-underline" to={customer ? "/home" : "/products"}>
          ShopKart
        </Link>
        <span className="clinical-logo-tag">PRECISION ELECTRONICS</span>
      </div>

      <nav className="clinical-nav navbar-actions" aria-label="Main navigation">
        <Link className="clinical-nav-link products-link hover-underline" to="/products">
          Products
        </Link>
        {customer && (
          <Link className="clinical-nav-link wishlist-link hover-underline" to="/wishlist">
            Wishlist
          </Link>
        )}
        {customer && (
          <Link className="clinical-nav-link orders-link hover-underline" to="/orders">
            My Orders
          </Link>
        )}
      </nav>

      <div className="clinical-header-actions">
        <Link className="clinical-cart-link cart-link hover-underline" to="/cart">
          Cart ({cartCount})
        </Link>

        {customer ? (
          <button
            type="button"
            className="button button-secondary clinical-auth-btn"
            onClick={handleLogout}
            disabled={loggingOut}
            style={{ padding: "6px 12px", fontSize: "11px" }}
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        ) : (
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <Link
              className="clinical-auth-link hover-underline auth-nav-link"
              to="/login"
            >
              Log in
            </Link>
            <span style={{ color: "#D4CCC4" }}>|</span>
            <Link
              className="clinical-auth-link hover-underline auth-nav-link"
              to="/register"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
