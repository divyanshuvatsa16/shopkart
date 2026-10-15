const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const customerRoutes = require("./routes/customer.routes");
const productRoutes = require("./routes/product.routes");
const wishlistRoutes = require("./routes/wishlist.routes");
const cartRoutes = require("./routes/cart.routes");
const orderRoutes = require("./routes/order.routes");

function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  // Ensure DB is connected before handling any request (serverless-safe)
  app.use(async (req, res, next) => {
    try {
      await connectDatabase();
      next();
    } catch (err) {
      next(err);
    }
  });

  app.use("/customers", customerRoutes);
  app.use("/products", productRoutes);
  app.use("/wishlist", wishlistRoutes);
  app.use("/cart", cartRoutes);
  app.use("/orders", orderRoutes);

  return app;
}

// Cache the connection across warm invocations
let connectionPromise = null;

function connectDatabase() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!process.env.MONGO_URI) {
    return Promise.reject(new Error("MONGO_URI is required"));
  }
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGO_URI).catch((err) => {
      connectionPromise = null; // allow retry on next request
      throw err;
    });
  }
  return connectionPromise;
}

const app = createApp();

// Only listen when run directly: `node backend/index.js`
if (require.main === module) {
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is required");
    process.exit(1);
  }
  const port = process.env.PORT || 5000;
  connectDatabase()
    .then(() => {
      app.listen(port, () => {
        console.log(`ShopKart server is running on port ${port}`);
      });
    })
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}

module.exports = app;
module.exports.createApp = createApp;
module.exports.connectDatabase = connectDatabase;