const express = require("express");
const authenticateCustomer = require("../middlewares/auth.middleware");
const {
  createPaymentOrder,
  verifyPayment,
  getMyOrders,
  getMyOrder,
} = require("../controllers/order.controller");

const router = express.Router();

router.post("/create-payment-order", authenticateCustomer, createPaymentOrder);
router.post("/verify-payment", authenticateCustomer, verifyPayment);
router.get("/", authenticateCustomer, getMyOrders);
router.get("/:id", authenticateCustomer, getMyOrder);

module.exports = router;