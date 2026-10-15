const express = require("express");
const authenticateCustomer = require("../middlewares/auth.middleware");
const {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
} = require("../controllers/cart.controller");

const router = express.Router();

router.post("/:productId", authenticateCustomer, addToCart);
router.get("/", authenticateCustomer, getCart);
router.patch("/:productId", authenticateCustomer, updateCartItem);
router.delete("/:productId", authenticateCustomer, removeFromCart);

module.exports = router;