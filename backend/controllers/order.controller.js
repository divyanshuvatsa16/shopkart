const crypto = require("crypto");
const mongoose = require("mongoose");
const Customer = require("../models/customer.model");
const Product = require("../models/product.model");
const Order = require("../models/order.model");
const razorpay = require("../config/razorpay");

const PHONE_REGEX = /^\d{10}$/;
const PINCODE_REGEX = /^\d{6}$/;

function validateShippingAddress(address) {
  if (!address || typeof address !== "object") {
    return "Shipping address is required";
  }

  const required = ["fullName", "addressLine1", "city", "state"];
  for (const field of required) {
    if (!address[field] || !String(address[field]).trim()) {
      return `${field} is required`;
    }
  }

  if (!address.phone || !PHONE_REGEX.test(String(address.phone).trim())) {
    return "Phone must be exactly 10 digits";
  }

  if (!address.pincode || !PINCODE_REGEX.test(String(address.pincode).trim())) {
    return "Pincode must be exactly 6 digits";
  }

  return null;
}

async function createPaymentOrder(req, res) {
  try {
    const validationError = validateShippingAddress(req.body?.shippingAddress);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    if (!req.user.cart || req.user.cart.length === 0) {
      return res.status(400).json({ success: false, message: "Your cart is empty" });
    }

    const ids = req.user.cart.map((item) => item.product);
    const products = await Product.find({ _id: { $in: ids } });
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    const items = [];
    let totalAmount = 0;

    for (const cartItem of req.user.cart) {
      const product = productMap.get(cartItem.product.toString());

      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product '${cartItem.product}' is no longer available`,
        });
      }

      if (product.stock < cartItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}`,
        });
      }

      items.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: cartItem.quantity,
        image: product.image,
      });

      totalAmount += product.price * cartItem.quantity;
    }

    const trimmedAddress = {
      fullName: req.body.shippingAddress.fullName.trim(),
      phone: String(req.body.shippingAddress.phone).trim(),
      addressLine1: req.body.shippingAddress.addressLine1.trim(),
      city: req.body.shippingAddress.city.trim(),
      state: req.body.shippingAddress.state.trim(),
      pincode: String(req.body.shippingAddress.pincode).trim(),
    };

    const order = await Order.create({
      user: req.user._id,
      items,
      shippingAddress: trimmedAddress,
      totalAmount,
      status: "PENDING_PAYMENT",
      paymentStatus: "PENDING",
    });

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100),
      currency: "INR",
      receipt: order._id.toString(),
    });

    order.razorpayOrderId = razorpayOrder.id;
    await order.save();

    return res.status(201).json({
      success: true,
      shopKartOrderId: order._id.toString(),
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("createPaymentOrder error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to create payment order" });
  }
}

async function verifyPayment(req, res) {
  try {
    const { shopKartOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body ?? {};

    if (!shopKartOrderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Missing payment verification fields" });
    }

    if (!mongoose.isValidObjectId(shopKartOrderId)) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = await Order.findById(shopKartOrderId);

    if (!order || order.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.status !== "PENDING_PAYMENT") {
      return res
        .status(400)
        .json({ success: false, message: "Order is not awaiting payment" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(order.razorpayOrderId + "|" + razorpay_payment_id)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const receivedBuffer = Buffer.from(String(razorpay_signature), "hex");

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment signature" });
    }

    order.paymentStatus = "PAID";
    order.status = "PLACED";
    order.razorpayPaymentId = razorpay_payment_id;
    await order.save();

    const bulkOps = order.items.map((item) => ({
      updateOne: {
        filter: { _id: item.product },
        update: { $inc: { stock: -item.quantity } },
      },
    }));

    if (bulkOps.length > 0) {
      await Product.bulkWrite(bulkOps);
    }

    req.user.cart = [];
    await req.user.save();

    return res.json({ success: true, order });
  } catch (error) {
    console.error("verifyPayment error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to verify payment" });
  }
}

async function getMyOrders(req, res) {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    return res.json({ success: true, orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load orders" });
  }
}

async function getMyOrder(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = await Order.findById(id);

    if (!order || order.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    return res.json({ success: true, order });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load order" });
  }
}

module.exports = { createPaymentOrder, verifyPayment, getMyOrders, getMyOrder };