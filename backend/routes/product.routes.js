const express = require("express");
const {
  createProduct,
  getProducts,
  getProductById,
  deleteProductById,
} = require("../controllers/product.controller");

const router = express.Router();

router.post("/", createProduct);
router.get("/", getProducts);
router.get("/:id", getProductById);
router.delete("/:id", deleteProductById);
module.exports = router;
