import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FormField from "../components/FormField";
import { createPaymentOrder, verifyPayment } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const initialForm = {
  fullName: "",
  phone: "",
  addressLine1: "",
  city: "",
  state: "",
  pincode: "",
};

function formatPrice(price) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

function loadScript(src) {
  return new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function validate(form) {
  const errors = {};
  for (const [field, value] of Object.entries(form)) {
    if (!String(value).trim()) {
      errors[field] = "This field is required";
    }
  }
  if (!errors.phone && !/^\d{10}$/.test(form.phone.trim())) {
    errors.phone = "Phone must be exactly 10 digits";
  }
  if (!errors.pincode && !/^\d{6}$/.test(form.pincode.trim())) {
    errors.pincode = "Pincode must be exactly 6 digits";
  }
  return errors;
}

const PAYMENT_METHODS = [
  {
    id: "COD",
    name: "Cash on Delivery (COD)",
    badge: "PAY ON RECEIPT",
    description: "Pay with cash or UPI at your doorstep upon hardware delivery.",
    icon: "💵",
  },
  {
    id: "UPI",
    name: "UPI / QR Code",
    badge: "INSTANT ZERO FEE",
    description: "Google Pay, PhonePe, Paytm, BHIM, or Scan QR.",
    icon: "📱",
  },
  {
    id: "CARD",
    name: "Credit / Debit Card (Instant Test)",
    badge: "FASTEST & SECURE",
    description: "Visa, MasterCard, RuPay — simulated test checkout with immediate verification.",
    icon: "💳",
  },
  {
    id: "RAZORPAY",
    name: "Razorpay Gateway",
    badge: "OFFICIAL MODAL",
    description: "Complete checkout through Razorpay's modal (NetBanking, Wallets, Cards).",
    icon: "⚡",
  },
];

export default function Checkout() {
  const navigate = useNavigate();
  const { customer } = useAuth();
  const { cartItems, cartLoading, subtotal, refreshCart } = useCart();
  const [form, setForm] = useState(() => ({
    ...initialForm,
    fullName: customer?.fullName || "",
    phone: customer?.phone || "",
  }));
  const [errors, setErrors] = useState({});
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [upiId, setUpiId] = useState("divyanshu@okhdfcbank");
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "4532 •••• •••• 8892",
    expiry: "12/28",
    cvv: "789",
  });
  const [placing, setPlacing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (customer) {
      setForm((prev) => ({
        ...prev,
        fullName: prev.fullName || customer.fullName || "",
        phone: prev.phone || customer.phone || "",
      }));
    }
  }, [customer]);

  useEffect(() => {
    if (cartLoading) return;
    if (cartItems.length === 0) {
      navigate("/cart", { replace: true });
    }
  }, [cartLoading, cartItems.length, navigate]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

    if (paymentMethod === "UPI" && !upiId.trim()) {
      setErrorMessage("Please enter a valid UPI ID");
      return;
    }

    setPlacing(true);

    try {
      const trimmedForm = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, String(v).trim()])
      );

      // ──────────────────────────────────────────────
      // 1. CASH ON DELIVERY (COD)
      // ──────────────────────────────────────────────
      if (paymentMethod === "COD") {
        const response = await createPaymentOrder({
          shippingAddress: trimmedForm,
          paymentMethod: "COD",
        });

        await refreshCart();
        navigate(`/orders/${response.order._id}`, { replace: true });
        return;
      }

      // ──────────────────────────────────────────────
      // 2. UPI / QR CODE
      // ──────────────────────────────────────────────
      if (paymentMethod === "UPI") {
        const response = await createPaymentOrder({
          shippingAddress: trimmedForm,
          paymentMethod: "UPI",
          paymentDetails: { upiId: upiId.trim() },
        });

        await refreshCart();
        navigate(`/orders/${response.order._id}`, { replace: true });
        return;
      }

      // ──────────────────────────────────────────────
      // 3. INSTANT TEST / CARD CHECKOUT
      // ──────────────────────────────────────────────
      if (paymentMethod === "CARD") {
        const cardLast4 = cardDetails.cardNumber.slice(-4) || "8892";
        const response = await createPaymentOrder({
          shippingAddress: trimmedForm,
          paymentMethod: "CARD",
          paymentDetails: { cardLast4 },
        });

        await refreshCart();
        navigate(`/orders/${response.order._id}`, { replace: true });
        return;
      }

      // ──────────────────────────────────────────────
      // 4. RAZORPAY GATEWAY (WITH AUTOMATIC SIMULATION FALLBACK)
      // ──────────────────────────────────────────────
      if (paymentMethod === "RAZORPAY") {
        const paymentData = await createPaymentOrder({
          shippingAddress: trimmedForm,
          paymentMethod: "RAZORPAY",
        });

        // If backend returned mockMode (e.g. placeholder test keys in use)
        if (paymentData.mockMode) {
          await verifyPayment({
            shopKartOrderId: paymentData.shopKartOrderId,
            razorpay_order_id: paymentData.razorpayOrderId,
            razorpay_payment_id: "pay_sim_" + Date.now(),
            mockMode: true,
          });
          await refreshCart();
          navigate(`/orders/${paymentData.shopKartOrderId}`, { replace: true });
          return;
        }

        // Live/Real Razorpay Modal
        const loaded = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
        if (!loaded) {
          setErrorMessage("Unable to load Razorpay script. Please check ad-blockers.");
          setPlacing(false);
          return;
        }

        const paymentObject = new window.Razorpay({
          key: paymentData.key,
          amount: paymentData.amount,
          currency: paymentData.currency,
          order_id: paymentData.razorpayOrderId,
          name: "ShopKart",
          description: "ShopKart Electronics Order",
          prefill: {
            name: trimmedForm.fullName,
            contact: trimmedForm.phone,
          },
          handler: async (response) => {
            try {
              await verifyPayment({
                shopKartOrderId: paymentData.shopKartOrderId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              await refreshCart();
              navigate(`/orders/${paymentData.shopKartOrderId}`, { replace: true });
            } catch (verifyError) {
              setErrorMessage(verifyError.message || "Payment verification failed");
            } finally {
              setPlacing(false);
            }
          },
          modal: {
            ondismiss: () => {
              setPlacing(false);
            },
          },
        });

        paymentObject.on("payment.failed", (response) => {
          const reason =
            response?.error?.description ||
            response?.error?.reason ||
            "Payment failed. Please try another method.";
          setErrorMessage(reason);
          setPlacing(false);
        });

        paymentObject.open();
      }
    } catch (submitError) {
      setErrorMessage(submitError.message || "Unable to place order");
      setPlacing(false);
    }
  }

  if (cartLoading) {
    return (
      <main className="products-page">
        <p className="products-state">Loading checkout...</p>
      </main>
    );
  }

  return (
    <main className="products-page">
      <section className="products-content checkout-page" aria-labelledby="checkout-title">
        <p className="eyebrow">CHECKOUT // ORDER & PAYMENT SPECIFICATION</p>
        <h1 id="checkout-title" className="serif-heading">Checkout</h1>

        {/* ── Order Summary ── */}
        <section className="order-summary" aria-label="Order summary">
          <h2 className="serif-heading">Order Summary</h2>
          {cartItems.map((item) => (
            <div
              key={item.product._id}
              style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}
            >
              <span>
                {item.product.name} × {item.quantity}
              </span>
              <strong className="tabular-nums">
                {formatPrice(item.product.price * item.quantity)}
              </strong>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderTop: "1px solid var(--border-clinical)",
              paddingTop: "12px",
              marginTop: "8px",
            }}
          >
            <span>Total Payable:</span>
            <strong className="tabular-nums" style={{ fontSize: "1.1rem" }}>
              {formatPrice(subtotal)}
            </strong>
          </div>
        </section>

        {/* ── Checkout Form ── */}
        <form className="checkout-form" onSubmit={handleSubmit} noValidate>
          <h2 className="serif-heading">1. Shipping Address</h2>
          <FormField
            label="Full Name"
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            error={errors.fullName}
          />
          <FormField
            label="Phone"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
            error={errors.phone}
          />
          <FormField
            label="Address Line 1"
            name="addressLine1"
            value={form.addressLine1}
            onChange={handleChange}
            error={errors.addressLine1}
          />
          <FormField
            label="City"
            name="city"
            value={form.city}
            onChange={handleChange}
            error={errors.city}
          />
          <FormField
            label="State"
            name="state"
            value={form.state}
            onChange={handleChange}
            error={errors.state}
          />
          <FormField
            label="Pincode"
            name="pincode"
            value={form.pincode}
            onChange={handleChange}
            error={errors.pincode}
          />

          {/* ── Payment Method Section ── */}
          <div style={{ marginTop: "28px", marginBottom: "20px" }}>
            <h2 className="serif-heading" style={{ marginBottom: "12px" }}>
              2. Select Payment Method
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {PAYMENT_METHODS.map((method) => {
                const isSelected = paymentMethod === method.id;
                return (
                  <label
                    key={method.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      padding: "14px 16px",
                      backgroundColor: isSelected ? "var(--bg-panel)" : "var(--bg-paper)",
                      border: `1px solid ${isSelected ? "var(--text-ink)" : "var(--border-clinical)"}`,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.id}
                      checked={isSelected}
                      onChange={() => setPaymentMethod(method.id)}
                      style={{ marginTop: "4px" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "16px" }}>{method.icon}</span>
                        <strong style={{ fontSize: "14px" }}>{method.name}</strong>
                        <span
                          className="tabular-nums"
                          style={{
                            fontSize: "10px",
                            padding: "2px 6px",
                            backgroundColor: isSelected ? "var(--accent-green)" : "var(--border-clinical)",
                            color: isSelected ? "#fff" : "var(--text-secondary)",
                            letterSpacing: "0.08em",
                          }}
                        >
                          {method.badge}
                        </span>
                      </div>
                      <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                        {method.description}
                      </p>

                      {/* Extra Sub-Forms depending on method */}
                      {isSelected && method.id === "UPI" && (
                        <div
                          style={{
                            marginTop: "12px",
                            padding: "12px",
                            border: "1px dashed var(--border-clinical)",
                            backgroundColor: "var(--bg-paper)",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <label style={{ fontSize: "11px", display: "block", marginBottom: "6px", color: "var(--text-secondary)" }}>
                            ENTER VIRTUAL PAYMENT ADDRESS (VPA / UPI ID):
                          </label>
                          <input
                            type="text"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            placeholder="username@okhdfcbank"
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              border: "1px solid var(--border-clinical)",
                              fontFamily: "var(--font-mono)",
                              fontSize: "13px",
                            }}
                          />
                          <p style={{ fontSize: "11px", color: "var(--accent-green)", marginTop: "6px" }}>
                            ✓ Instant payment approval enabled via UPI intent protocol
                          </p>
                        </div>
                      )}

                      {isSelected && method.id === "CARD" && (
                        <div
                          style={{
                            marginTop: "12px",
                            padding: "12px",
                            border: "1px dashed var(--border-clinical)",
                            backgroundColor: "var(--bg-paper)",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <div style={{ flex: "2", minWidth: "160px" }}>
                              <label style={{ fontSize: "10px", display: "block", marginBottom: "4px", color: "var(--text-secondary)" }}>
                                CARD NUMBER
                              </label>
                              <input
                                type="text"
                                value={cardDetails.cardNumber}
                                onChange={(e) => setCardDetails({ ...cardDetails, cardNumber: e.target.value })}
                                style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--border-clinical)", fontFamily: "var(--font-mono)" }}
                              />
                            </div>
                            <div style={{ flex: "1", minWidth: "70px" }}>
                              <label style={{ fontSize: "10px", display: "block", marginBottom: "4px", color: "var(--text-secondary)" }}>
                                EXPIRY
                              </label>
                              <input
                                type="text"
                                value={cardDetails.expiry}
                                onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                                style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--border-clinical)", fontFamily: "var(--font-mono)" }}
                              />
                            </div>
                            <div style={{ flex: "1", minWidth: "60px" }}>
                              <label style={{ fontSize: "10px", display: "block", marginBottom: "4px", color: "var(--text-secondary)" }}>
                                CVV
                              </label>
                              <input
                                type="password"
                                value={cardDetails.cvv}
                                onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                                style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--border-clinical)", fontFamily: "var(--font-mono)" }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {errorMessage && (
            <p className="form-error" role="alert" style={{ marginBottom: "16px" }}>
              {errorMessage}
            </p>
          )}

          <button className="button" type="submit" disabled={placing} style={{ width: "100%", padding: "14px" }}>
            {placing
              ? "Processing Order..."
              : paymentMethod === "COD"
              ? `Confirm Order — ${formatPrice(subtotal)} (Cash on Delivery)`
              : paymentMethod === "UPI"
              ? `Pay ${formatPrice(subtotal)} via UPI`
              : paymentMethod === "CARD"
              ? `Pay ${formatPrice(subtotal)} with Card`
              : `Proceed with Razorpay — ${formatPrice(subtotal)}`}
          </button>
        </form>
      </section>
    </main>
  );
}
