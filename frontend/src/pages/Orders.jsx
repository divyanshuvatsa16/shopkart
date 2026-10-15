import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyOrders } from "../services/api";

function formatPrice(price) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    getMyOrders()
      .then((data) => {
        if (active) setOrders(data.orders ?? []);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function loadOrders() {
    setError(false);
    setLoading(true);
    getMyOrders()
      .then((data) => setOrders(data.orders ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  return (
    <main className="products-page">
      <section className="products-content orders-page" aria-labelledby="orders-title">
        <p className="eyebrow">YOUR ORDERS // PURCHASE HISTORY</p>
        <h1 id="orders-title" className="serif-heading">My Orders</h1>

        {loading && <p className="products-state">Loading your orders...</p>}

        {!loading && error && (
          <div className="products-state" role="alert">
            <p>Unable to load your orders.</p>
            <button type="button" className="button button-secondary" onClick={loadOrders} style={{ marginTop: "12px" }}>
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="products-state">
            <p style={{ fontSize: "16px", marginBottom: "8px" }}>You have not placed any orders yet.</p>
            <p style={{ marginBottom: "20px" }}>No previous orders found under your account.</p>
            <Link className="button" to="/products">Start Shopping</Link>
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <section className="orders-list" aria-label="Orders">
            {orders.map((order) => (
              <article key={order._id} className="order-card">
                <header className="order-card-header">
                  <p className="order-id">Order #{order._id.slice(-8).toUpperCase()}</p>
                  <p className="order-date tabular-nums">{formatDate(order.createdAt)}</p>
                </header>
                <ul className="order-items">
                  {(order.items ?? []).map((item) => (
                    <li key={item.product}>
                      {item.name} × {item.quantity}
                    </li>
                  ))}
                </ul>
                <p className="order-total">
                  Total: <strong className="tabular-nums">{formatPrice(order.totalAmount)}</strong>
                </p>
                <Link className="button button-secondary order-details-link" to={`/orders/${order._id}`}>
                  View Details →
                </Link>
              </article>
            ))}
          </section>
        )}
      </section>
    </main>
  );
}