import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import SearchBar from "../components/SearchBar";
import {
  addToWishlist,
  getProducts,
  getWishlist,
  removeFromWishlist,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function Products() {
  const navigate = useNavigate();
  const location = useLocation();
  const { customer } = useAuth();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [toggleMessage, setToggleMessage] = useState("");
  const { addToCart, actionId } = useCart();
  const [cartMessage, setCartMessage] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    const productsPromise = getProducts({ search, category });
    const wishlistPromise = customer ? getWishlist() : Promise.resolve({ wishlist: [] });

    Promise.all([productsPromise, wishlistPromise])
      .then(([productsData, wishlistData]) => {
        if (!active) return;
        setProducts(productsData.products || []);
        setWishlistIds(new Set((wishlistData.wishlist ?? []).map((p) => p._id)));
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [search, category, customer]);

  async function handleToggle(productId, action) {
    if (!customer) {
      navigate("/login", { state: { from: location } });
      return;
    }

    setWishlistIds((prev) => {
      const next = new Set(prev);
      if (action === "add") next.add(productId);
      else next.delete(productId);
      return next;
    });

    try {
      if (action === "add") {
        await addToWishlist(productId).catch(async (err) => {
          if (err.message && /already in wishlist/i.test(err.message)) return;
          throw err;
        });
      } else {
        await removeFromWishlist(productId);
      }
      setToggleMessage("");
    } catch (err) {
      setWishlistIds((prev) => {
        const next = new Set(prev);
        if (action === "add") next.delete(productId);
        else next.add(productId);
        return next;
      });
      setToggleMessage(err.message || "Could not update wishlist");
    }
  }

  async function handleAddToCart(productId) {
    if (!customer) {
      navigate("/login", { state: { from: location } });
      return;
    }

    setCartMessage("");
    try {
      await addToCart(productId);
      setCartMessage("Added to cart!");
      setTimeout(() => setCartMessage(""), 3000);
    } catch (err) {
      setCartMessage(err.message || "Could not add to cart");
    }
  }

  return (
    <main className="products-page">
      <section className="products-content" aria-labelledby="products-title">
        <div className="catalog-header-bar">
          <div>
            <p className="eyebrow">ELECTRONICS CATALOGUE // GENUINE HARDWARE</p>
            <h1 id="products-title" className="serif-heading">Products</h1>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-meta)" }}>
            INVENTORY // IN STOCK & READY TO SHIP
          </span>
        </div>
        <SearchBar search={search} category={category} onSearchChange={setSearch} onCategoryChange={setCategory} />
        {toggleMessage && (
          <p className="products-state" role="alert">{toggleMessage}</p>
        )}
        {cartMessage && (
          <p className="products-state" role="alert">{cartMessage}</p>
        )}
        {loading && <p className="products-state">Loading products...</p>}
        {!loading && error && <p className="products-state" role="alert">Something went wrong while loading products.</p>}
        {!loading && !error && products.length === 0 && <p className="products-state">No products found.</p>}
        {!loading && !error && products.length > 0 && (
          <section className="product-grid" aria-label="Products">
            {products.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                inWishlist={wishlistIds.has(product._id)}
                onToggle={handleToggle}
                onAddToCart={handleAddToCart}
                addingToCart={actionId === product._id}
              />
            ))}
          </section>
        )}
      </section>
    </main>
  );
}
