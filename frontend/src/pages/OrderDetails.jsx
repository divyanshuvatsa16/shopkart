import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMyOrder } from "../services/api";

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

function statusClass(status) {
  const map = {
    PENDING_PAYMENT: "status-badge status-pending",
    PLACED: "status-badge status-placed",
    CONFIRMED: "status-badge status-confirmed",
    SHIPPED: "status-badge status-shipped",
    DELIVERED: "status-badge status-delivered",
    PENDING: "status-badge status-pending",
    PAID: "status-badge status-paid",
    FAILED: "status-badge status-failed",
  };
  return map[status] || "status-badge";
}

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);
    setError(false);

    getMyOrder(id)
      .then((data) => {
        if (active) setOrder(data.order);
      })
      .catch((err) => {
        if (!active) return;
        if (err.message && /not found/i.test(err.message)) {
          setNotFound(true);
        } else {
          setError(true);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  function loadOrder() {
    setError(false);
    setLoading(true);
    getMyOrder(id)
      .then((data) => setOrder(data.order))
      .catch((err) => {
        if (err.message && /not found/i.test(err.message)) {
          setNotFound(true);
        } else {
          setError(true);
        }
      })
      .finally(() => setLoading(false));
  }

  if (loading) {
    return (
      <main className="products-page">
        <p className="products-state">Loading order details...</p>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="products-page">
        <section className="products-content">
          <p className="products-state" role="alert">Order not found.</p>
          <div style={{ marginTop: "16px", textAlign: "center" }}>
            <Link className="button button-secondary" to="/orders">Back to My Orders</Link>
          </div>
        </section>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="products-page">
        <section className="products-content">
          <p className="products-state" role="alert">Unable to load this order.</p>
          <div style={{ marginTop: "16px", textAlign: "center" }}>
            <button type="button" className="button button-secondary" onClick={loadOrder}>
              Try Again
            </button>
          </div>
        </section>
      </main>
    );
  }

  const justPlaced = order.status === "PLACED" && order.paymentStatus === "PAID";

  return (
    <main className="products-page">
      <section className="products-content order-details-page" aria-labelledby="order-title">
        {justPlaced && (
          <p className="order-success" style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--accent-green)", marginBottom: "12px" }}>
            ✓ ORDER CONFIRMED // PAYMENT RECEIVED
          </p>
        )}
        <p className="eyebrow">ORDER RECEIPT // VERIFIED PURCHASE</p>
        <h1 id="order-title" className="serif-heading">Order #{order._id.slice(-8).toUpperCase()}</h1>
        <p className="order-meta tabular-nums">Placed on {formatDate(order.createdAt)}</p>

        <p className="order-status-row">
          Status: <span className={statusClass(order.status)}>{order.status}</span>
          <span className={statusClass(order.paymentStatus)}>Payment: {order.paymentStatus}</span>
        </p>

        <section className="order-summary" aria-label="Items">
          <h2 className="serif-heading">Order Items</h2>
          {(order.items ?? []).map((item) => (
            <div key={item.product} className="order-item-row">
              <img className="order-item-image clinical-image" src={item.image} alt={item.name} />
              <div className="order-item-content">
                <p className="order-item-name" style={{ fontWeight: "700" }}>{item.name}</p>
                <p className="tabular-nums" style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  {item.quantity} × {formatPrice(item.price)} ={" "}
                  <strong>{formatPrice(item.price * item.quantity)}</strong>
                </p>
              </div>
            </div>
          ))}
          <p className="order-total" style={{ borderTop: "1px solid var(--border-clinical)", paddingTop: "12px", marginTop: "12px" }}>
            Total: <strong className="tabular-nums">{formatPrice(order.totalAmount)}</strong>
          </p>
        </section>

        <section className="order-summary" aria-label="Shipping address">
          <h2 className="serif-heading">Shipping Address</h2>
          <p><strong>{order.shippingAddress?.fullName}</strong></p>
          <p>{order.shippingAddress?.addressLine1}</p>
          <p>
            {order.shippingAddress?.city}, {order.shippingAddress?.state} —{" "}
            <span className="tabular-nums">{order.shippingAddress?.pincode}</span>
          </p>
          <p className="tabular-nums">Contact: {order.shippingAddress?.phone}</p>
        </section>

        {justPlaced && (
          <div className="order-details-actions" style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
            <Link className="button button-secondary" to="/orders">View My Orders</Link>
            <Link className="button" to="/products">Continue Shopping</Link>
          </div>
        )}
      </section>
    </main>
  );
}