import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  addToCart as addToCartApi,
  getCart as getCartApi,
  removeFromCart as removeFromCartApi,
  updateCartItem as updateCartItemApi,
} from "../services/api";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { customer, loading: authLoading } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartError, setCartError] = useState(false);
  const [actionId, setActionId] = useState(null);

  const refreshCart = useCallback(async () => {
    if (!customer) {
      setCartItems([]);
      setCartLoading(false);
      return;
    }
    setCartLoading(true);
    setCartError(false);
    try {
      const data = await getCartApi();
      setCartItems(data.cart ?? []);
    } catch {
      setCartError(true);
    } finally {
      setCartLoading(false);
    }
  }, [customer]);

  useEffect(() => {
    if (authLoading) return;
    if (customer) {
      refreshCart();
    } else {
      setCartItems([]);
      setCartLoading(false);
      setCartError(false);
    }
  }, [customer, authLoading, refreshCart]);

  async function performAction(productId, fn) {
    setActionId(productId);
    try {
      const data = await fn();
      setCartItems(data.cart ?? []);
    } finally {
      setActionId(null);
    }
  }

  const addToCart = useCallback(
    (productId) => performAction(productId, () => addToCartApi(productId)),
    []
  );

  const updateQuantity = useCallback(
    (productId, quantity) =>
      performAction(productId, () => updateCartItemApi(productId, quantity)),
    []
  );

  const removeFromCart = useCallback(
    (productId) => performAction(productId, () => removeFromCartApi(productId)),
    []
  );

  const cartCount = useMemo(
    () => cartItems.reduce((n, i) => n + i.quantity, 0),
    [cartItems]
  );

  const subtotal = useMemo(
    () =>
      cartItems.reduce((s, i) => s + (i.product?.price ?? 0) * i.quantity, 0),
    [cartItems]
  );

  const value = useMemo(
    () => ({
      cartItems,
      cartLoading,
      cartError,
      cartCount,
      subtotal,
      actionId,
      refreshCart,
      addToCart,
      updateQuantity,
      removeFromCart,
    }),
    [cartItems, cartLoading, cartError, cartCount, subtotal, actionId, refreshCart, addToCart, updateQuantity, removeFromCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside a CartProvider");
  }
  return context;
}