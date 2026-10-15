const mongoose = require("mongoose");
const Customer = require("../models/customer.model");
const Product = require("../models/product.model");

function findCartItemIndex(user, productId) {
  return user.cart.findIndex((item) => item.product.equals(productId));
}

async function getPopulatedCart(customerId) {
  const customer = await Customer.findById(customerId).populate({
    path: "cart.product",
    select: "name price image stock",
  });
  return customer?.cart ?? [];
}

async function addToCart(req, res) {
  const { productId } = req.params;

  if (!mongoose.isValidObjectId(productId)) {
    return res.status(400).json({ success: false, message: "Invalid product ID" });
  }

  try {
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const index = findCartItemIndex(req.user, productId);

    if (index >= 0) {
      const newQuantity = req.user.cart[index].quantity + 1;
      if (newQuantity > product.stock) {
        return res
          .status(400)
          .json({ success: false, message: "Quantity exceeds available stock" });
      }
      req.user.cart[index].quantity = newQuantity;
    } else {
      if (product.stock < 1) {
        return res
          .status(400)
          .json({ success: false, message: "Quantity exceeds available stock" });
      }
      req.user.cart.push({ product: productId, quantity: 1 });
    }

    await req.user.save();

    const cart = await getPopulatedCart(req.user._id);
    return res.status(201).json({ success: true, cart });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to add to cart" });
  }
}

async function getCart(req, res) {
  try {
    const cart = await getPopulatedCart(req.user._id);
    return res.json({ success: true, cart });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load cart" });
  }
}

async function updateCartItem(req, res) {
  const { productId } = req.params;
  const { quantity } = req.body ?? {};

  if (!mongoose.isValidObjectId(productId)) {
    return res.status(400).json({ success: false, message: "Invalid product ID" });
  }

  if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity < 1) {
    return res.status(400).json({ success: false, message: "Quantity must be at least 1" });
  }

  try {
    const index = findCartItemIndex(req.user, productId);

    if (index < 0) {
      return res.status(404).json({ success: false, message: "Product not in cart" });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (quantity > product.stock) {
      return res
        .status(400)
        .json({ success: false, message: "Quantity exceeds available stock" });
    }

    req.user.cart[index].quantity = quantity;
    await req.user.save();

    const cart = await getPopulatedCart(req.user._id);
    return res.json({ success: true, cart });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to update cart item" });
  }
}

async function removeFromCart(req, res) {
  const { productId } = req.params;

  if (!mongoose.isValidObjectId(productId)) {
    return res.status(400).json({ success: false, message: "Invalid product ID" });
  }

  try {
    const index = findCartItemIndex(req.user, productId);

    if (index < 0) {
      return res.status(404).json({ success: false, message: "Product not in cart" });
    }

    req.user.cart.splice(index, 1);
    await req.user.save();

    const cart = await getPopulatedCart(req.user._id);
    return res.json({ success: true, cart });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to remove from cart" });
  }
}

module.exports = { addToCart, getCart, updateCartItem, removeFromCart };