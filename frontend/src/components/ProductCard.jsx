import { Link } from "react-router-dom";

function formatPrice(price) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

export default function ProductCard({
  product,
  inWishlist,
  onToggle,
  onAddToCart,
  addingToCart,
}) {
  const showWishlist = typeof onToggle === "function";
  const showAddToCart = typeof onAddToCart === "function";

  return (
    <article className="product-card">
      <div className="product-card-media">
        <img
          className="product-image clinical-image"
          src={product.image}
          alt={product.name}
          loading="lazy"
        />
      </div>

      <div className="product-card-content">
        <p className="product-category">{product.category}</p>
        <h2 className="serif-heading">{product.name}</h2>
        <p className="product-price tabular-nums">{formatPrice(product.price)}</p>
        <p className={product.stock > 0 ? "stock-available" : "stock-empty"}>
          {product.stock > 0
            ? `${product.stock} units available`
            : "Currently depleted"}
        </p>

        <div className="product-card-actions">
          {showAddToCart && (
            <button
              type="button"
              className="button add-to-cart"
              onClick={() => onAddToCart(product._id)}
              disabled={Boolean(addingToCart) || (product.stock ?? 0) <= 0}
            >
              {addingToCart
                ? "Processing..."
                : (product.stock ?? 0) <= 0
                ? "Out of Stock"
                : "Add to Cart"}
            </button>
          )}

          {showWishlist && (
            <button
              type="button"
              className={`button wishlist-toggle ${
                inWishlist ? "wishlist-toggle-active" : ""
              }`}
              onClick={() => onToggle(product._id, inWishlist ? "remove" : "add")}
              aria-pressed={Boolean(inWishlist)}
            >
              {inWishlist ? "Saved in Wishlist" : "+ Add to Wishlist"}
            </button>
          )}

          <Link
            className="button button-secondary product-button"
            to={`/products/${product._id}`}
          >
            View Details →
          </Link>
        </div>
      </div>
    </article>
  );
}
