import { Link } from "react-router-dom";

function formatPrice(price) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

export default function WishlistCard({ product, onRemove, removing }) {
  return (
    <article className="product-card wishlist-card">
      <div className="product-card-media" style={{ height: "200px" }}>
        <img
          className="product-image clinical-image"
          src={product.image}
          alt={product.name}
        />
      </div>

      <div className="product-card-content">
        <p className="product-category">{product.category}</p>
        <h2 className="serif-heading">{product.name}</h2>
        <p className="product-price tabular-nums">{formatPrice(product.price)}</p>
        <p className={product.stock > 0 ? "stock-available" : "stock-empty"}>
          {product.stock > 0 ? `${product.stock} units available` : "Out of stock"}
        </p>

        <div style={{ display: "grid", gap: "8px", marginTop: "auto" }}>
          <Link className="button product-button" to={`/products/${product._id}`}>
            View Details
          </Link>
          <button
            type="button"
            className="button button-secondary wishlist-remove"
            onClick={() => onRemove(product._id)}
            disabled={removing}
          >
            {removing ? "Removing..." : "Remove"}
          </button>
        </div>
      </div>
    </article>
  );
}
