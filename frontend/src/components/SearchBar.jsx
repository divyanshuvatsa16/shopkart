const categories = ["", "Electronics", "Fashion", "Books", "Home"];

export default function SearchBar({ search, category, onSearchChange, onCategoryChange }) {
  return (
    <section className="product-filters" aria-label="Product filters">
      <input
        type="search"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search products..."
        aria-label="Search products"
      />
      <select value={category} onChange={(event) => onCategoryChange(event.target.value)} aria-label="Filter by category">
        {categories.map((item) => <option key={item} value={item}>{item || "All Categories"}</option>)}
      </select>
    </section>
  );
}
