const API_URL = "/api"

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || "Something went wrong");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const registerCustomer = (customer) =>
  request("/customers/register", {
    method: "POST",
    body: JSON.stringify(customer),
  });

export const loginCustomer = (credentials) =>
  request("/customers/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

export const getCurrentCustomer = () => request("/customers/me");

export const logoutCustomer = () =>
  request("/customers/logout", { method: "POST" });

export const getProducts = ({ search = "", category = "" } = {}) => {
  const query = new URLSearchParams();
  if (search.trim()) query.set("search", search.trim());
  if (category) query.set("category", category);

  const suffix = query.toString();
  return request(`/products${suffix ? `?${suffix}` : ""}`);
};

export const getProduct = (id) => request(`/products/${id}`);

export const addToWishlist = (productId) =>
  request(`/wishlist/${productId}`, { method: "POST" });

export const getWishlist = () => request("/wishlist");

export const removeFromWishlist = (productId) =>
  request(`/wishlist/${productId}`, { method: "DELETE" });

export const addToCart = (productId) =>
  request(`/cart/${productId}`, { method: "POST" });

export const getCart = () => request("/cart");

export const updateCartItem = (productId, quantity) =>
  request(`/cart/${productId}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });

export const removeFromCart = (productId) =>
  request(`/cart/${productId}`, { method: "DELETE" });

export const createPaymentOrder = (shippingAddress) =>
  request("/orders/create-payment-order", {
    method: "POST",
    body: JSON.stringify({ shippingAddress }),
  });

export const verifyPayment = (payload) =>
  request("/orders/verify-payment", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getMyOrders = () => request("/orders");

export const getMyOrder = (id) => request(`/orders/${id}`);
