const Customer = require("../models/customer.model");
const bcrypt = require("bcrypt");
const generateToken = require("../utils/generateToken");

function customerResponse(customer) {
  return {
    _id: customer._id,
    fullName: customer.fullName,
    email: customer.email,
    phone: customer.phone,
  };
}

async function registerCustomer(req, res) {
  try {
    const { fullName, email, password, phone } = req.body;

    if (!fullName || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const existingCustomer = await Customer.findOne({ email: email.toLowerCase() });

    if (existingCustomer) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    const customer = await Customer.create({ fullName, email, password, phone });

    return res.status(201).json({
      success: true,
      message: "Customer registered successfully",
      customer: customerResponse(customer),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to register customer",
    });
  }
}

async function loginCustomer(req, res) {
  try {
    const { email, password } = req.body;

    const customer = await Customer.findOne({ email: email?.toLowerCase() }).select("+password");
    const isPasswordCorrect = customer && (await bcrypt.compare(password || "", customer.password));

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = generateToken(customer._id.toString());

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });

    return res.json({
      success: true,
      message: "Login successful",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to log in",
    });
  }
}

function getMyProfile(req, res) {
  return res.json(customerResponse(req.user));
}

function logoutCustomer(req, res) {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });

  return res.json({
    success: true,
    message: "Logged out successfully",
  });
}

module.exports = {
  registerCustomer,
  loginCustomer,
  getMyProfile,
  logoutCustomer,
  customerResponse,
};
