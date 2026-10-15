const express = require("express");
const authenticateCustomer = require("../middlewares/auth.middleware");
const {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} = require("../controllers/wishlist.controller");

const router = express.Router();

router.post("/:productId", authenticateCustomer, addToWishlist);
router.get("/", authenticateCustomer, getWishlist);
router.delete("/:productId", authenticateCustomer, removeFromWishlist);

module.exports = router;
