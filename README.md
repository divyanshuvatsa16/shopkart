# ShopKart — Precision Electronics & Hardware Store

[![Node.js](https://img.shields.io/badge/Node.js-v20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v5.1-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-v19.1-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_v8.18-47A248?logo=mongodb&logoColor=white)](https://mongoosejs.com/)
[![Razorpay](https://img.shields.io/badge/Payments-Razorpay-0C2340?logo=razorpay&logoColor=white)](https://razorpay.com/)
[![Vite](https://img.shields.io/badge/Bundler-Vite_v7.1-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

**ShopKart** is a production-grade, full-stack e-commerce web platform engineered for precision electronics, components, and hardware retail. The project is built with a decoupled architecture featuring a RESTful Node.js/Express backend, MongoDB database via Mongoose, and a React 19 single-page application (SPA) bundled with Vite.

The platform includes end-to-end user workflows: product discovery with multi-parameter filtering, secure cookie-based customer authentication, persistent carts and wishlists, and a payment pipeline integrated with Razorpay featuring HMAC-SHA256 signature verification.

---

## Table of Contents

- [1. Overview & Key Capabilities](#1-overview--key-capabilities)
- [2. Tech Stack](#2-tech-stack)
- [3. Project Architecture & Directory Structure](#3-project-architecture--directory-structure)
- [4. API Reference](#4-api-reference)
  - [Customer & Authentication Endpoints](#customer--authentication-endpoints)
  - [Product Catalog Endpoints](#product-catalog-endpoints)
  - [Wishlist Endpoints](#wishlist-endpoints)
  - [Cart Endpoints](#cart-endpoints)
  - [Order & Payment Endpoints](#order--payment-endpoints)
- [5. Technical Decisions & Architectural Patterns](#5-technical-decisions--architectural-patterns)
  - [Serverless-Ready Database Connection Caching](#1-serverless-ready-database-connection-caching)
  - [HTTP-Only Cookie-Based Authentication](#2-http-only-cookie-based-authentication)
  - [Reverse-Proxy Architecture on Vercel](#3-reverse-proxy-architecture-on-vercel)
  - [Order Snapshotting for Historical Integrity](#4-order-snapshotting-for-historical-integrity)
  - [Server-Side Financial Calculations & Stock Safeguards](#5-server-side-financial-calculations--stock-safeguards)
  - [Timing-Safe Payment Signature Verification](#6-timing-safe-payment-signature-verification)
  - [Atomic Bulk Stock Decrementing](#7-atomic-bulk-stock-decrementing)
  - [Warm Clinical & Academic Research Design System](#8-warm-clinical--academic-research-design-system)
  - [Native Node.js Tooling](#9-native-nodejs-tooling)
- [6. Environment Variables](#6-environment-variables)
- [7. Local Development & Setup](#7-local-development--setup)
- [8. Deployment Guide](#8-deployment-guide)

---

## 1. Overview & Key Capabilities

- **Product Discovery & Exploration**:
  - Full catalog listing with server-side category filters and case-insensitive regex search.
  - Dedicated product detail view with live stock status and specifications.
- **Customer Authentication & Profile Management**:
  - Email/password registration with bcrypt password hashing (10 salt rounds).
  - Stateless JWT stored in secure `httpOnly` cookies, preventing XSS token harvesting.
  - Profile dashboard for authenticated users.
- **Wishlist Management**:
  - Personal saved items list linked to the customer document with product population.
  - One-click toggle directly from product cards or detail views.
- **Shopping Cart with Live Boundary Checks**:
  - Persisted cart synchronized with customer account across sessions and devices.
  - Client-side and server-side stock boundary validations on addition and quantity updates.
  - Dynamic subtotal and total calculations.
- **Checkout & Razorpay Payment Integration**:
  - Structured shipping address capture with strict phone (10-digit) and pincode (6-digit) validation.
  - Server-calculated Razorpay order generation in INR (with paise precision).
  - Interactive Razorpay Checkout popup with automatic failure handling and modal dismiss safeguards.
  - Timing-safe HMAC-SHA256 signature verification upon payment completion.
- **Order Lifecycle & Tracking**:
  - Atomic stock decrements via MongoDB `bulkWrite` upon verified payment.
  - Automatic cart clearing following successful transactions.
  - Order history and comprehensive invoice-style order detail views.

---

## 2. Tech Stack

### Backend
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **Node.js** | `>=20.0.0` | Runtime environment with native `--env-file` and `--watch` |
| **Express** | `^5.1.0` | Next-generation web application routing framework |
| **MongoDB / Mongoose** | `^8.18.0` | Object Data Modeling (ODM) for document schemas |
| **JSON Web Token (`jsonwebtoken`)** | `^9.0.2` | Authentication token generation and validation |
| **bcrypt** | `^6.0.0` | Cryptographic password hashing |
| **cookie-parser** | `^1.4.7` | HTTP request cookie parsing |
| **cors** | `^2.8.6` | Cross-Origin Resource Sharing with credentials |
| **Razorpay SDK** | `^2.9.8` | Payment gateway order generation and API interaction |
| **Node Crypto** | Built-in | Timing-safe HMAC-SHA256 signature verification |

### Frontend
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **React** | `^19.1.1` | User interface library |
| **React Router** | `^7.8.2` | Client-side routing, protected and guest route wrappers |
| **Vite** | `^7.1.3` | Fast module bundler and development server |
| **Vitest & JSDOM** | `^3.2.4` / `^26.1` | Unit and integration test environment |
| **React Testing Library** | `^16.3.0` | Component DOM testing utilities |
| **Razorpay Checkout** | External CDN | In-browser payment modal handler |
| **Custom Vanilla CSS** | Custom System | "Warm Clinical" design system with zero-radius grid |

---

## 3. Project Architecture & Directory Structure

```
ShopKart/
├── README.md
├── backend/
│   ├── config/
│   │   └── razorpay.js            # Razorpay instance configuration
│   ├── controllers/
│   │   ├── cart.controller.js     # Cart items & quantity business logic
│   │   ├── customer.controller.js # Auth: register, login, me, logout
│   │   ├── order.controller.js    # Razorpay order creation & payment verification
│   │   ├── product.controller.js  # Product listing, search, creation, deletion
│   │   └── wishlist.controller.js # Wishlist management business logic
│   ├── middlewares/
│   │   └── auth.middleware.js     # JWT cookie extraction & user authentication
│   ├── models/
│   │   ├── customer.model.js      # Customer schema with embedded cart & wishlist
│   │   ├── order.model.js         # Order schema with item snapshots & shipping info
│   │   └── product.model.js       # Product schema (name, price, stock, category)
│   ├── routes/
│   │   ├── cart.routes.js         # /cart routes
│   │   ├── customer.routes.js     # /customers routes
│   │   ├── order.routes.js        # /orders routes
│   │   ├── product.routes.js      # /products routes
│   │   └── wishlist.routes.js     # /wishlist routes
│   ├── utils/
│   │   └── generateToken.js       # JWT signing helper
│   ├── index.js                   # Express application factory & server startup
│   └── package.json
└── frontend/
    ├── public/
    ├── src/
    │   ├── components/
    │   │   ├── CartItem.jsx       # Cart row with quantity and removal controls
    │   │   ├── Footer.jsx         # Site footer
    │   │   ├── FormField.jsx      # Accessible input field with error messaging
    │   │   ├── GuestRoute.jsx     # Route guard redirecting authenticated users
    │   │   ├── Layout.jsx         # Core app wrapper with Navbar and Footer
    │   │   ├── Navbar.jsx         # Navigation bar with live cart count & auth state
    │   │   ├── ProductCard.jsx    # Product grid tile with quick actions
    │   │   ├── ProtectedRoute.jsx # Route guard redirecting unauthenticated users
    │   │   ├── SearchBar.jsx      # Live query and category dropdown controls
    │   │   └── WishlistCard.jsx   # Wishlist grid card with remove option
    │   ├── context/
    │   │   ├── AuthContext.jsx    # Session state & authentication providers
    │   │   └── CartContext.jsx    # Cart items, badge count & subtotal provider
    │   ├── pages/
    │   │   ├── Cart.jsx           # Shopping cart view
    │   │   ├── Checkout.jsx       # Shipping form and Razorpay modal integration
    │   │   ├── Home.jsx           # Authenticated user account details
    │   │   ├── Login.jsx          # Login view
    │   │   ├── OrderDetails.jsx   # Specific order breakdown & item snapshots
    │   │   ├── Orders.jsx         # User order history
    │   │   ├── ProductDetails.jsx # Detailed single-product view
    │   │   ├── Products.jsx       # Product catalog & filterable search results
    │   │   ├── Register.jsx       # Account registration view
    │   │   └── Wishlist.jsx       # Saved customer wishlist view
    │   ├── services/
    │   │   └── api.js             # Centralized fetch wrapper with credentials
    │   ├── App.jsx                # Router declaration and route hierarchy
    │   ├── index.css              # Academic Research & Warm Clinical design system
    │   └── main.jsx               # React DOM root entrypoint
    ├── vercel.json                # API reverse proxy configuration for Vercel
    ├── vite.config.js             # Vite configuration with React & Vitest
    └── package.json
```

---

## 4. API Reference

All requests accept and return `application/json`. Authenticated routes require an active session token passed via the HTTP-only `token` cookie.

### Customer & Authentication Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/customers/register` | Public | Register a new customer |
| `POST` | `/customers/login` | Public | Authenticate credentials and receive `token` cookie |
| `GET` | `/customers/me` | Authenticated | Fetch current authenticated customer profile |
| `POST` | `/customers/logout` | Authenticated | Invalidate and clear the session cookie |

#### `POST /customers/register`
- **Request Body**:
  ```json
  {
    "fullName": "Jane Doe",
    "email": "jane@example.com",
    "password": "securepassword123",
    "phone": "9876543210"
  }
  ```
- **Success Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "message": "Customer registered successfully",
    "customer": {
      "_id": "670c5e3d...",
      "fullName": "Jane Doe",
      "email": "jane@example.com",
      "phone": "9876543210"
    }
  }
  ```

#### `POST /customers/login`
- **Request Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "securepassword123"
  }
  ```
- **Success Response (`200 OK`)**:
  - *Headers*: `Set-Cookie: token=<jwt>; HttpOnly; Path=/; SameSite=Lax`
  ```json
  {
    "success": true,
    "message": "Login successful"
  }
  ```

---

### Product Catalog Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/products` | Public | List products with optional search and category filters |
| `GET` | `/products/:id` | Public | Retrieve detailed specifications for a single product |
| `POST` | `/products` | Public / Admin | Create a new catalog item |
| `DELETE` | `/products/:id` | Public / Admin | Remove a catalog item |

#### `GET /products`
- **Query Parameters**:
  - `search` *(optional)*: Case-insensitive regex substring search against product `name`.
  - `category` *(optional)*: Exact category filter.
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "count": 2,
    "products": [
      {
        "_id": "670c611f...",
        "name": "Oscilloscope 100MHz Dual Channel",
        "price": 24999,
        "category": "Lab Instruments",
        "image": "https://images.unsplash.com/...",
        "stock": 12
      }
    ]
  }
  ```

#### `POST /products`
- **Request Body**:
  ```json
  {
    "name": "Benchtop Digital Multimeter",
    "description": "High accuracy 5.5 digit digital multimeter with true RMS.",
    "price": 14500,
    "category": "Testing Equipment",
    "image": "https://example.com/dmm.jpg",
    "stock": 25
  }
  ```
- **Success Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "product": { ... }
  }
  ```

---

### Wishlist Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/wishlist` | Authenticated | Retrieve customer's saved products |
| `POST` | `/wishlist/:productId` | Authenticated | Add a product to the customer's wishlist |
| `DELETE` | `/wishlist/:productId` | Authenticated | Remove a product from the wishlist |

#### `GET /wishlist`
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "count": 1,
    "wishlist": [
      {
        "_id": "670c611f...",
        "name": "Oscilloscope 100MHz Dual Channel",
        "price": 24999,
        "category": "Lab Instruments",
        "image": "https://images.unsplash.com/...",
        "stock": 12
      }
    ]
  }
  ```

---

### Cart Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/cart` | Authenticated | Retrieve items in the customer's cart |
| `POST` | `/cart/:productId` | Authenticated | Add item to cart or increment quantity by 1 |
| `PATCH` | `/cart/:productId` | Authenticated | Update quantity of a specific cart item |
| `DELETE` | `/cart/:productId` | Authenticated | Remove an item completely from the cart |

#### `POST /cart/:productId` & `PATCH /cart/:productId`
- **PATCH Request Body**:
  ```json
  {
    "quantity": 3
  }
  ```
- **Success Response (`200 OK` or `201 Created`)**:
  ```json
  {
    "success": true,
    "cart": [
      {
        "product": {
          "_id": "670c611f...",
          "name": "Oscilloscope 100MHz Dual Channel",
          "price": 24999,
          "image": "https://images.unsplash.com/...",
          "stock": 12
        },
        "quantity": 3
      }
    ]
  }
  ```
- **Stock Overflow Response (`400 Bad Request`)**:
  ```json
  {
    "success": false,
    "message": "Quantity exceeds available stock"
  }
  ```

---

### Order & Payment Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/orders/create-payment-order` | Authenticated | Validate cart & generate a Razorpay order |
| `POST` | `/orders/verify-payment` | Authenticated | Verify signature, decrement stock, and place order |
| `GET` | `/orders` | Authenticated | List all historical orders for the customer |
| `GET` | `/orders/:id` | Authenticated | Get full details for a specific order |

#### `POST /orders/create-payment-order`
- **Request Body**:
  ```json
  {
    "shippingAddress": {
      "fullName": "Jane Doe",
      "phone": "9876543210",
      "addressLine1": "42 Silicon Avenue, Tech Park",
      "city": "Bengaluru",
      "state": "Karnataka",
      "pincode": "560100"
    }
  }
  ```
- **Success Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "shopKartOrderId": "670c793a...",
    "razorpayOrderId": "order_OzKx7ABC123456",
    "amount": 7499700,
    "currency": "INR",
    "key": "rzp_test_..."
  }
  ```

#### `POST /orders/verify-payment`
- **Request Body**:
  ```json
  {
    "shopKartOrderId": "670c793a...",
    "razorpay_order_id": "order_OzKx7ABC123456",
    "razorpay_payment_id": "pay_OzKyXYZ987654",
    "razorpay_signature": "e6a2b84..."
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "order": {
      "_id": "670c793a...",
      "user": "670c5e3d...",
      "items": [
        {
          "product": "670c611f...",
          "name": "Oscilloscope 100MHz Dual Channel",
          "price": 24999,
          "quantity": 3,
          "image": "https://images.unsplash.com/..."
        }
      ],
      "shippingAddress": { ... },
      "totalAmount": 74997,
      "status": "PLACED",
      "paymentStatus": "PAID",
      "razorpayOrderId": "order_OzKx7ABC123456",
      "razorpayPaymentId": "pay_OzKyXYZ987654",
      "createdAt": "2026-10-14T00:00:00.000Z"
    }
  }
  ```

---

## 5. Technical Decisions & Architectural Patterns

### 1. Serverless-Ready Database Connection Caching
In conventional Express apps, `mongoose.connect()` is called once on startup. In serverless environments (such as Vercel Serverless Functions or AWS Lambda), each invocation can trigger redundant connection overhead or exhaust database connection limits.
- **Pattern**: `backend/index.js` caches the Mongoose connection promise via `connectionPromise` and validates `mongoose.connection.readyState === 1`.
- **Resilience**: If a connection fails, the cached promise is reset to `null`, ensuring the next request automatically retries connecting instead of freezing in an error state.
- **Middleware Guard**: A dedicated Express middleware guarantees the database is ready before any route handler executes.

### 2. HTTP-Only Cookie-Based Authentication
Storing authentication tokens in browser `localStorage` or `sessionStorage` exposes tokens to Cross-Site Scripting (XSS) extraction.
- **Decision**: Tokens are signed as JWTs and returned inside `httpOnly: true` cookies (with `secure: true` when `NODE_ENV === "production"`).
- **Session Hydration**: On app startup, `AuthContext` calls `/customers/me` to safely populate the user session without client-side token exposure.

### 3. Reverse-Proxy Architecture on Vercel
Modern browsers enforce strict third-party cookie restrictions (e.g., Safari ITP and Chrome privacy controls). When the frontend is hosted on a different domain than the backend, cross-origin cookies can be blocked or dropped.
- **Solution**: The frontend `vercel.json` configures a native rewrite:
  ```json
  {
    "rewrites": [
      { "source": "/api/:path*", "destination": "https://shopkart-kappa-ruddy.vercel.app/:path*" }
    ]
  }
  ```
- **Benefit**: Browser requests to `/api/*` are treated as same-origin requests, preserving cookies reliably across all browsers without third-party cookie workarounds.

### 4. Order Snapshotting for Historical Integrity
In e-commerce databases, storing only foreign references to product documents within an order introduces data corruption when product titles, images, or prices update later.
- **Solution**: The `orderItemSchema` in `models/order.model.js` creates a standalone immutable snapshot containing `{ product, name, price, quantity, image }` at the exact second the purchase was created.

### 5. Server-Side Financial Calculations & Stock Safeguards
Client-side amounts sent in request payloads should never be trusted for billing.
- **Integrity**: `order.controller.js` retrieves product documents directly from MongoDB using `Product.find({ _id: { $in: ids } })` to calculate the final total on the server.
- **Double Stock Check**: Quantities are validated against available stock both when modifying the shopping cart and during payment order generation.

### 6. Timing-Safe Payment Signature Verification
Comparing cryptographic hashes using standard string equality (`===`) is vulnerable to side-channel timing attacks, where differences in string comparison duration leak signature bytes.
- **Implementation**: The backend hashes `razorpayOrderId + "|" + razorpay_payment_id` with `RAZORPAY_KEY_SECRET` using HMAC-SHA256 and compares buffers using `crypto.timingSafeEqual`:
  ```javascript
  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const receivedBuffer = Buffer.from(String(razorpay_signature), "hex");
  if (expectedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
    return res.status(400).json({ success: false, message: "Invalid payment signature" });
  }
  ```

### 7. Atomic Bulk Stock Decrementing
Once payment verification succeeds, stock counts are updated in a single atomic database operation using MongoDB's `bulkWrite`:
```javascript
const bulkOps = order.items.map((item) => ({
  updateOne: {
    filter: { _id: item.product },
    update: { $inc: { stock: -item.quantity } },
  },
}));
await Product.bulkWrite(bulkOps);
```
This guarantees consistent inventory updates across multiple items in an order.

### 8. Warm Clinical & Academic Research Design System
The frontend implements a custom, bespoke design system avoiding standard generic component libraries:
- **Geometry**: Strict zero-curve reset (`border-radius: 0 !important`, `box-shadow: none !important`) and a 1px border grid system (`--border-clinical: #D4CCC4`).
- **Color Palette**: Warm paper tones (`--bg-paper: #F5F3F0`, `--bg-panel: #F0EBE5`), carbon black text (`--text-ink: #2A2824`), and muted sage accents (`--accent-green: #6B7D6B`).
- **Typography Hierarchy**: Editorial serif headlines with tight tracking (`Gambetta`), clean humanistic sans for navigation and body text (`Satoshi`), and monospace tabular numerals (`JetBrains Mono`) for electrical ratings, SKUs, and monetary figures.

### 9. Native Node.js Tooling
Rather than introducing external utility packages like `nodemon` or `dotenv`, the backend uses native modern Node.js CLI capabilities:
- `--env-file=.env`: Native environment variable parsing.
- `--watch`: Native file watching for zero-dependency hot reloading during local development.

---

## 6. Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/shopkart?retryWrites=true&w=majority

# Authentication
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters
JWT_EXPIRES_IN=1d

# Cross-Origin Resource Sharing
FRONTEND_ORIGIN=http://localhost:5173

# Razorpay Payment Gateway
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret_key
```

---

## 7. Local Development & Setup

### Prerequisites
- **Node.js** v20.0.0 or higher
- **MongoDB** running locally or a MongoDB Atlas cluster URI
- **Razorpay Test Account** (for test API keys)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd ShopKart
```

### 2. Configure Backend
```bash
cd backend
npm install
# Populate your .env file as documented in Section 6
npm run dev
```
The backend server will launch on `http://localhost:5000` with active file watching.

### 3. Configure Frontend
Open a separate terminal session:
```bash
cd frontend
npm install
npm run dev
```
The frontend Vite development server will start at `http://localhost:5173`.

---

## 8. Deployment Guide

### Backend Deployment (e.g. Vercel / Render / AWS)
1. Ensure the following environment variables are configured in your deployment platform:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN`
   - `FRONTEND_ORIGIN` (set to your production frontend URL)
   - `NODE_ENV=production`
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
2. Run build/start command: `npm start` (or let the serverless handler invoke `createApp()`).

### Frontend Deployment (Vercel)
1. Connect your frontend directory to Vercel.
2. In `frontend/vercel.json`, verify the destination URL points to your deployed backend:
   ```json
   {
     "rewrites": [
       { "source": "/api/:path*", "destination": "https://<your-backend-app>.vercel.app/:path*" }
     ]
   }
   ```
3. Set the build command to `npm run build` and output directory to `dist`.
