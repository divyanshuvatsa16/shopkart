import { useCallback, useEffect, useState } from "react";
import WishlistCard from "../components/WishlistCard";
import { getWishlist, removeFromWishlist } from "../services/api";

export default function Wishlist() {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    getWishlist()
      .then((data) => {
        if (active) setWishlist(data.wishlist ?? []);
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
  }, [reloadKey]);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  async function handleRemove(productId) {
    setRemovingId(productId);
    try {
      await removeFromWishlist(productId);
      setWishlist((prev) => prev.filter((p) => p._id !== productId));
    } catch {
      setError(true);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <main className="products-page">
      <section className="products-content wishlist-page" aria-labelledby="wishlist-title">
        <p className="eyebrow">SAVED PRODUCTS // WISHLIST</p>
        <h1 id="wishlist-title" className="serif-heading">Your Wishlist</h1>
        {loading && <p className="products-state">Loading wishlist...</p>}
        {!loading && error && (
          <div className="products-state" role="alert">
            <p>Unable to load wishlist.</p>
            <button type="button" className="button button-secondary" onClick={retry} style={{ marginTop: "12px" }}>
              Try Again
            </button>
          </div>
        )}
        {!loading && !error && wishlist.length === 0 && (
          <p className="products-state">Your wishlist is currently empty.</p>
        )}
        {!loading && !error && wishlist.length > 0 && (
          <section className="product-grid" aria-label="Wishlist">
            {wishlist.map((product) => (
              <WishlistCard
                key={product._id}
                product={product}
                onRemove={handleRemove}
                removing={removingId === product._id}
              />
            ))}
          </section>
        )}
      </section>
    </main>
  );
}
