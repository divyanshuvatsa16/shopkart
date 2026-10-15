import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  addToWishlist,
  getProduct,
  getWishlist,
  removeFromWishlist,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

function formatPrice(price) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

export default function ProductDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { customer } = useAuth();
  const { addToCart, actionId } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState("");
  const [cartMessage, setCartMessage] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    getProduct(id)
      .then((data) => {
        if (active) setProduct(data.product);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    if (customer) {
      getWishlist()
        .then((data) => {
          if (!active) return;
          setInWishlist((data.wishlist ?? []).some((p) => p._id === id));
        })
        .catch(() => {});
    } else {
      setInWishlist(false);
    }

    return () => {
      active = false;
    };
  }, [id, customer]);

  async function handleToggle() {
    if (!customer) {
      navigate("/login", { state: { from: location } });
      return;
    }

    setToggling(true);
    setToggleError("");
    const next = !inWishlist;
    setInWishlist(next);
    try {
      if (next) {
        await addToWishlist(id).catch((err) => {
          if (err.message && /already in wishlist/i.test(err.message)) return;
          throw err;
        });
      } else {
        await removeFromWishlist(id);
      }
    } catch (err) {
      setInWishlist(!next);
      setToggleError(err.message || "Could not update wishlist");
    } finally {
      setToggling(false);
    }
  }

  async function handleAddToCart() {
    if (!customer) {
      navigate("/login", { state: { from: location } });
      return;
    }

    setCartMessage("");
    try {
      await addToCart(id);
      setCartMessage("Added to cart!");
      setTimeout(() => setCartMessage(""), 3000);
    } catch (err) {
      setCartMessage(err.message || "Could not add to cart");
    }
  }

  if (loading) {
    return (
      <main className="products-page">
        <p className="products-state">Loading product details...</p>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="products-page">
        <p className="products-state" role="alert">
          Something went wrong while loading product.
        </p>
      </main>
    );
  }

  const isAdding = actionId === id;
  const isOutOfStock = (product.stock ?? 0) <= 0;

  return (
    <main className="products-page">
      <section className="product-details">
        <div className="product-details-gallery">
          <img
            className="product-details-image clinical-image"
            src={product.image}
            alt={product.name}
          />
        </div>

        <div className="product-details-content">
          <Link to="/products" className="back-link hover-underline">
            ← Back to products
          </Link>
          <p className="product-category">{product.category}</p>
          <h1 className="serif-heading">{product.name}</h1>
          <p className="product-description">{product.description}</p>
          <p className="product-price tabular-nums">{formatPrice(product.price)}</p>
          <p className={!isOutOfStock ? "stock-available" : "stock-empty"}>
            {!isOutOfStock ? `${product.stock} units left` : "Out of stock"}
          </p>

          <div className="product-details-actions">
            <button
              type="button"
              className="button add-to-cart"
              onClick={handleAddToCart}
              disabled={isOutOfStock || isAdding}
            >
              {isAdding ? "Adding..." : isOutOfStock ? "Out of Stock" : "Add to Cart"}
            </button>
            <button
              type="button"
              className={`button wishlist-toggle ${
                inWishlist ? "wishlist-toggle-active" : ""
              }`}
              onClick={handleToggle}
              disabled={toggling}
              aria-pressed={inWishlist}
            >
              {toggling
                ? "Saving..."
                : inWishlist
                ? "Saved in Wishlist"
                : "+ Add to Wishlist"}
            </button>
          </div>

          {cartMessage && (
            <p className="products-state" role="alert" style={{ marginTop: "16px", padding: "12px" }}>
              {cartMessage}
            </p>
          )}
          {toggleError && (
            <p className="form-error" role="alert" style={{ marginTop: "12px" }}>
              {toggleError}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
