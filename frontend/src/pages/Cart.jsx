import { Link, useNavigate } from "react-router-dom";
import CartItem from "../components/CartItem";
import { useCart } from "../context/CartContext";

function formatPrice(price) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

export default function Cart() {
  const navigate = useNavigate();
  const {
    cartItems,
    cartLoading,
    cartError,
    subtotal,
    actionId,
    refreshCart,
    updateQuantity,
    removeFromCart,
  } = useCart();

  async function handleUpdate(productId, nextQuantity) {
    try {
      await updateQuantity(productId, nextQuantity);
    } catch {
      await refreshCart();
    }
  }

  async function handleRemove(productId) {
    try {
      await removeFromCart(productId);
    } catch {
      await refreshCart();
    }
  }

  function handleCheckout() {
    navigate("/checkout");
  }

  const totalUnits = cartItems.reduce((n, i) => n + i.quantity, 0);

  return (
    <main className="products-page">
      <section className="products-content cart-page" aria-labelledby="cart-title">
        <p className="eyebrow">YOUR CART // READY TO CHECKOUT</p>
        <h1 id="cart-title" className="serif-heading">My Cart</h1>

        {cartLoading && <p className="products-state">Loading your cart...</p>}

        {!cartLoading && cartError && (
          <div className="products-state" role="alert">
            <p>Unable to load your cart.</p>
            <button type="button" className="button button-secondary" onClick={refreshCart} style={{ marginTop: "12px" }}>
              Try Again
            </button>
          </div>
        )}

        {!cartLoading && !cartError && cartItems.length === 0 && (
          <div className="products-state">
            <p style={{ fontSize: "16px", marginBottom: "8px" }}>Your cart is empty.</p>
            <p style={{ marginBottom: "20px" }}>Looks like you haven't added any products yet.</p>
            <Link className="button" to="/products">Browse Products</Link>
          </div>
        )}

        {!cartLoading && !cartError && cartItems.length > 0 && (
          <>
            <section className="product-grid" aria-label="Cart items">
              {cartItems.map((item) => (
                <CartItem
                  key={item.product._id}
                  item={item}
                  onIncrement={handleUpdate}
                  onDecrement={handleUpdate}
                  onRemove={handleRemove}
                  busy={actionId === item.product._id}
                />
              ))}
            </section>

            <div className="order-summary" aria-label="Order summary">
              <h2 className="serif-heading">Order Summary</h2>
              <p style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Items Count:</span>
                <strong className="tabular-nums">{totalUnits}</strong>
              </p>
              <p style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Subtotal:</span>
                <strong className="tabular-nums">{formatPrice(subtotal)}</strong>
              </p>
              <button type="button" className="button checkout-button" onClick={handleCheckout}>
                Proceed to Checkout →
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}