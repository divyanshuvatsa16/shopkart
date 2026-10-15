const express = require("express");
const {
  registerCustomer,
  loginCustomer,
  getMyProfile,
  logoutCustomer,
} = require("../controllers/customer.controller");
const authenticateCustomer = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/register", registerCustomer);
router.post("/login", loginCustomer);
router.get("/me", authenticateCustomer, getMyProfile);
router.post("/logout", authenticateCustomer, logoutCustomer);

module.exports = router;
