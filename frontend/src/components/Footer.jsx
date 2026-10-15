import { useState } from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  function handleSubscribe(e) {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
    }
  }

  return (
    <footer className="clinical-footer" aria-label="Electronics Store Footer">
      <div className="footer-main-grid">
        {/* Column 1: Logo & Electronics Headquarters Address */}
        <div className="footer-col">
          <p className="footer-logo">SHOPKART ELECTRONICS</p>
          <address className="footer-address">
            HARDWARE ENGINEERING & LOGISTICS<br />
            BUILDING 4, SILICON CORRIDOR<br />
            ELECTRONICS CITY, PHASE 1<br />
            BENGALURU, KA 560100<br />
            CONTACT: SUPPORT@SHOPKART.IN
          </address>
        </div>

        {/* Column 2: Index */}
        <div className="footer-col">
          <p className="footer-col-title">Index</p>
          <ul className="footer-link-list">
            <li>
              <Link to="/products" className="hover-underline">
                01. All Products
              </Link>
            </li>
            <li>
              <Link to="/cart" className="hover-underline">
                02. Shopping Cart
              </Link>
            </li>
            <li>
              <Link to="/orders" className="hover-underline">
                03. Order History
              </Link>
            </li>
            <li>
              <Link to="/wishlist" className="hover-underline">
                04. Saved Wishlist
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 3: Newsletter signup */}
        <div className="footer-col">
          <p className="footer-col-title">Newsletter</p>
          <p className="footer-newsletter-text">
            Subscribe for notifications on new hardware drops, component availability, and exclusive deals.
          </p>
          {subscribed ? (
            <p style={{ color: "#6B7D6B", fontFamily: "var(--font-mono)", fontSize: "11px" }}>
              ✓ SUBSCRIPTION CONFIRMED // WELCOME TO SHOPKART
            </p>
          ) : (
            <form className="footer-newsletter-form" onSubmit={handleSubscribe}>
              <label htmlFor="newsletter-email" style={{ display: "none" }}>
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                required
                placeholder="ENTER EMAIL ADDRESS"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="newsletter-input"
              />
              <button type="submit" className="button newsletter-submit-btn">
                Subscribe →
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="footer-bottom-bar">
        <span>
          © 2026 SHOPKART ELECTRONICS PRIVATE LIMITED. ALL RIGHTS RESERVED.
        </span>
        <span style={{ fontFamily: "var(--font-mono)" }}>
          VERIFIED HARDWARE & ORIGINAL MANUFACTURER WARRANTY
        </span>
      </div>
    </footer>
  );
}
