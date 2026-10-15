const mongoose = require("mongoose");
const Customer = require("../models/customer.model");
const Product = require("../models/product.model");

async function addToWishlist(req, res) {
  const { productId } = req.params;

  if (!mongoose.isValidObjectId(productId)) {
    return res.status(400).json({ success: false, message: "Invalid product ID" });
  }

  try {
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (req.user.wishlist.some((id) => id.equals(productId))) {
      return res.status(409).json({ success: false, message: "Product already in wishlist" });
    }

    req.user.wishlist.push(productId);
    await req.user.save();

    return res.status(201).json({ success: true, message: "Added to wishlist" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to add to wishlist" });
  }
}

async function getWishlist(req, res) {
  try {
    const customer = await Customer.findById(req.user._id).populate({
      path: "wishlist",
      select: "name price category image stock",
    });

    const wishlist = customer?.wishlist ?? [];

    return res.json({ success: true, count: wishlist.length, wishlist });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load wishlist" });
  }
}

async function removeFromWishlist(req, res) {
  const { productId } = req.params;

  if (!mongoose.isValidObjectId(productId)) {
    return res.status(400).json({ success: false, message: "Invalid product ID" });
  }

  try {
    if (!req.user.wishlist.some((id) => id.equals(productId))) {
      return res.status(404).json({ success: false, message: "Product not in wishlist" });
    }

    req.user.wishlist.pull(productId);
    await req.user.save();

    return res.json({ success: true, message: "Removed from wishlist" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to remove from wishlist" });
  }
}

module.exports = { addToWishlist, getWishlist, removeFromWishlist };
