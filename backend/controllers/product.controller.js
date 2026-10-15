const mongoose = require("mongoose");
const Product = require("../models/product.model");

async function createProduct(req, res) {
  try {
    const { name, description, price, category, image, stock } = req.body;
    const product = await Product.create({ name, description, price, category, image, stock });

    return res.status(201).json({ success: true, product });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(500).json({ success: false, message: "Unable to create product" });
  }
}

async function getProducts(req, res) {
  try {
    const query = {};
    const { search, category } = req.query;

    if (search) query.name = { $regex: search, $options: "i" };
    if (category) query.category = category;

    const products = await Product.find(query).select("name price category image stock");

    return res.json({ success: true, count: products.length, products });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load products" });
  }
}

async function getProductById(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid product ID" });
  }

  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    return res.json({ success: true, product });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load product" });
  }
}

async function deleteProductById(req, res) {
  if(!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({success: false, message: "Invalid product ID"})
  }

  try {
    const product = await Product.findByIdAndDelete(req.params.id)

    if(!product) {
      return res.status(404).json({success:false, message: "Product not found"})
    }

    return res.status(200).json({success:true, message:"Product deleted", id: req.params.id})
  }
  catch(error) {
    return res.status(500).json({success:false, message:"Invalid Product ID"})
  }
}

module.exports = { createProduct, getProducts, getProductById, deleteProductById };
