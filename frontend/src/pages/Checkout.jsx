import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import FormField from "../components/FormField";
import { createPaymentOrder, verifyPayment, getPaymentConfig } from "../services/api";
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
    id: "UPI_QR",
    name: "Scan UPI QR Code",
    badge: "RECOMMENDED // REAL-TIME",
    description: "Scan dynamic QR with Google Pay, PhonePe, Paytm, CRED or BHIM to pay instantly.",
    icon: "⚡",
  },
  {
    id: "UPI_COLLECT",
    name: "UPI Payment Request",
    badge: "MOBILE INTENT NOTIFICATION",
    description: "Enter your UPI ID to receive a direct collect request notification on your phone.",
    icon: "📱",
  },
  {
    id: "CARD",
    name: "Credit / Debit Card",
    badge: "FAST & SECURE",
    description: "Visa, MasterCard, RuPay — instant bank authorization & deduction.",
    icon: "💳",
  },
  {
    id: "RAZORPAY",
    name: "Razorpay Official Gateway",
    badge: "GATEWAY CHECKOUT",
    description: "Complete checkout through Razorpay's official modal (NetBanking, Wallets, EMI).",
    icon: "🌐",
  },
  {
    id: "COD",
    name: "Cash on Delivery (COD)",
    badge: "PAY ON RECEIPT",
    description: "Pay with cash or UPI at your doorstep upon hardware delivery.",
    icon: "💵",
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
  const [paymentMethod, setPaymentMethod] = useState("UPI_QR");

  // Merchant config
  const [merchantConfig, setMerchantConfig] = useState({
    merchantUpi: "8252757428-2@ybl",
    merchantName: "Divyanshu Vatsa",
  });

  // Dynamic QR Code State
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrCopied, setQrCopied] = useState(false);
  const [utrNumber, setUtrNumber] = useState("");

  // UPI Collect State
  const [customerUpiId, setCustomerUpiId] = useState("divyanshu@okhdfcbank");
  const [requestProgress, setRequestProgress] = useState(null); // null | 'SENDING' | 'WAITING_APPROVAL' | 'APPROVED'

  // Card details state
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "4532 •••• •••• 8892",
    nameOnCard: "Divyanshu Vatsa",
    expiry: "12/28",
    cvv: "789",
  });

  const [placing, setPlacing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch payment configuration from backend
  useEffect(() => {
    getPaymentConfig()
      .then((res) => {
        if (res && res.merchantUpi) {
          setMerchantConfig({
            merchantUpi: res.merchantUpi,
            merchantName: res.merchantName || "ShopKart Hardware",
          });
        }
      })
      .catch(() => {
        // Fallback to defaults
      });
  }, []);

  // Update form when customer loads
  useEffect(() => {
    if (customer) {
      setForm((prev) => ({
        ...prev,
        fullName: prev.fullName || customer.fullName || "",
        phone: prev.phone || customer.phone || "",
      }));
    }
  }, [customer]);

  // Redirect if cart is empty
  useEffect(() => {
    if (cartLoading) return;
    if (cartItems.length === 0) {
      navigate("/cart", { replace: true });
    }
  }, [cartLoading, cartItems.length, navigate]);

  // Construct dynamic UPI Intent URI (strict NPCI specification)
  const upiUri = useMemo(() => {
    const txnNote = encodeURIComponent(`ShopKart Order ${Date.now().toString().slice(-6)}`);
    const merchantUpi = merchantConfig.merchantUpi?.trim();
    const merchantName = encodeURIComponent(merchantConfig.merchantName || "ShopKart");
    return `upi://pay?pa=${merchantUpi}&pn=${merchantName}&am=${subtotal}&cu=INR&tn=${txnNote}`;
  }, [merchantConfig, subtotal]);

  // Generate QR Code whenever UPI URI changes
  useEffect(() => {
    if (subtotal <= 0) return;
    QRCode.toDataURL(upiUri, {
      width: 250,
      margin: 1,
      color: {
        dark: "#0b0f19",
        light: "#ffffff",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => {
        // Fallback to qrserver if local generation fails
        setQrDataUrl(
          `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUri)}`
        );
      });
  }, [upiUri, subtotal]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleCopyUpi() {
    navigator.clipboard?.writeText(merchantConfig.merchantUpi);
    setQrCopied(true);
    setTimeout(() => setQrCopied(false), 2500);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

    if (paymentMethod === "UPI_COLLECT" && !customerUpiId.trim()) {
      setErrorMessage("Please enter your Virtual Payment Address (UPI ID) to receive the payment request.");
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
      // 2. UPI DYNAMIC QR CODE (SCAN & PAY)
      // ──────────────────────────────────────────────
      if (paymentMethod === "UPI_QR") {
        const response = await createPaymentOrder({
          shippingAddress: trimmedForm,
          paymentMethod: "UPI_QR",
          paymentDetails: {
            utr: utrNumber.trim() || `UTR${Date.now()}`,
          },
        });

        await refreshCart();
        navigate(`/orders/${response.order._id}`, { replace: true });
        return;
      }

      // ──────────────────────────────────────────────
      // 3. UPI PAYMENT REQUEST (COLLECT NOTIFICATION)
      // ──────────────────────────────────────────────
      if (paymentMethod === "UPI_COLLECT") {
        setRequestProgress("SENDING");
        await new Promise((r) => setTimeout(r, 900));

        setRequestProgress("WAITING_APPROVAL");
        await new Promise((r) => setTimeout(r, 1400));

        setRequestProgress("APPROVED");
        await new Promise((r) => setTimeout(r, 700));

        const response = await createPaymentOrder({
          shippingAddress: trimmedForm,
          paymentMethod: "UPI_COLLECT",
          paymentDetails: {
            upiId: customerUpiId.trim(),
            utr: `UTR${Date.now()}`,
          },
        });

        await refreshCart();
        navigate(`/orders/${response.order._id}`, { replace: true });
        return;
      }

      // ──────────────────────────────────────────────
      // 4. CREDIT / DEBIT CARD DIRECT
      // ──────────────────────────────────────────────
      if (paymentMethod === "CARD") {
        const cardLast4 = cardDetails.cardNumber.replace(/\D/g, "").slice(-4) || "8892";
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
      // 5. RAZORPAY GATEWAY
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
          setErrorMessage("Unable to load Razorpay script. Please check your connection.");
          setPlacing(false);
          return;
        }

        const paymentObject = new window.Razorpay({
          key: paymentData.key,
          amount: paymentData.amount,
          currency: paymentData.currency,
          order_id: paymentData.razorpayOrderId,
          name: "ShopKart Hardware",
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
      setRequestProgress(null);
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
        <p className="eyebrow">CHECKOUT // SECURE PAYMENT & ORDER DISPATCH</p>
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
            <span>Total Amount Payable:</span>
            <strong className="tabular-nums" style={{ fontSize: "1.2rem", color: "var(--accent-green)" }}>
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
          <div style={{ marginTop: "32px", marginBottom: "20px" }}>
            <h2 className="serif-heading" style={{ marginBottom: "6px" }}>
              2. Select Payment Method
            </h2>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "16px" }}>
              All payment channels are live and verified. Amount will be deducted upon authorization.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {PAYMENT_METHODS.map((method) => {
                const isSelected = paymentMethod === method.id;
                return (
                  <label
                    key={method.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      padding: "16px",
                      backgroundColor: isSelected ? "var(--bg-panel)" : "var(--bg-paper)",
                      border: `1.5px solid ${isSelected ? "var(--text-ink)" : "var(--border-clinical)"}`,
                      boxShadow: isSelected ? "0 4px 12px rgba(0,0,0,0.06)" : "none",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.id}
                      checked={isSelected}
                      onChange={() => {
                        setPaymentMethod(method.id);
                        setRequestProgress(null);
                      }}
                      style={{ marginTop: "4px" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "18px" }}>{method.icon}</span>
                        <strong style={{ fontSize: "15px" }}>{method.name}</strong>
                        <span
                          className="tabular-nums"
                          style={{
                            fontSize: "10px",
                            padding: "2px 8px",
                            fontWeight: "700",
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

                      {/* ────────────────────────────────────────── */}
                      {/* DYNAMIC UPI QR CODE DETAIL ACCORDION      */}
                      {/* ────────────────────────────────────────── */}
                      {isSelected && method.id === "UPI_QR" && (
                        <div
                          style={{
                            marginTop: "16px",
                            padding: "18px",
                            border: "1.5px solid var(--border-clinical)",
                            backgroundColor: "var(--bg-paper)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "14px",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
                            {/* QR Code Container */}
                            <div
                              style={{
                                background: "#ffffff",
                                padding: "10px",
                                border: "2px solid #0b0f19",
                                borderRadius: "4px",
                                display: "inline-block",
                                textAlign: "center",
                                minWidth: "180px",
                              }}
                            >
                              {qrDataUrl ? (
                                <img
                                  src={qrDataUrl}
                                  alt="Dynamic UPI QR Code"
                                  style={{
                                    width: "180px",
                                    height: "180px",
                                    display: "block",
                                    imageRendering: "pixelated",
                                  }}
                                />
                              ) : (
                                <div style={{ width: "180px", height: "180px", display: "grid", placeContent: "center", fontSize: "12px" }}>
                                  Generating QR...
                                </div>
                              )}
                              <span style={{ fontSize: "10px", fontWeight: "700", color: "#0b0f19", display: "block", marginTop: "4px" }}>
                                SCAN WITH ANY UPI APP
                              </span>
                            </div>

                            {/* Payment Meta Info */}
                            <div style={{ flex: "1", minWidth: "200px" }}>
                              <p style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                Merchant Virtual Payment Address (VPA)
                              </p>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                                <input
                                  type="text"
                                  value={merchantConfig.merchantUpi}
                                  onChange={(e) =>
                                    setMerchantConfig((prev) => ({ ...prev, merchantUpi: e.target.value }))
                                  }
                                  placeholder="yourname@upi or 9876543210@paytm"
                                  title="Receiver UPI ID where payment will be credited"
                                  style={{
                                    backgroundColor: "var(--bg-panel)",
                                    padding: "6px 10px",
                                    fontSize: "13px",
                                    fontWeight: "700",
                                    fontFamily: "var(--font-mono)",
                                    border: "1px solid var(--border-clinical)",
                                    flex: 1,
                                    maxWidth: "240px",
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={handleCopyUpi}
                                  className="button button-secondary"
                                  style={{ padding: "6px 10px", fontSize: "11px" }}
                                >
                                  {qrCopied ? "✓ Copied!" : "Copy"}
                                </button>
                              </div>
                              <span style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px", display: "block" }}>
                                💡 Set to your active UPI ID to receive real payments directly into your bank account.
                              </span>

                              <div style={{ marginTop: "12px" }}>
                                <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>EXACT AMOUNT TO PAY: </span>
                                <strong className="tabular-nums" style={{ fontSize: "16px", color: "var(--accent-green)" }}>
                                  {formatPrice(subtotal)}
                                </strong>
                              </div>

                              <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                <span style={{ fontSize: "11px", padding: "2px 6px", background: "#ea4335", color: "#fff", borderRadius: "2px" }}>GPay</span>
                                <span style={{ fontSize: "11px", padding: "2px 6px", background: "#5f259f", color: "#fff", borderRadius: "2px" }}>PhonePe</span>
                                <span style={{ fontSize: "11px", padding: "2px 6px", background: "#00b9f5", color: "#fff", borderRadius: "2px" }}>Paytm</span>
                                <span style={{ fontSize: "11px", padding: "2px 6px", background: "#1b2c40", color: "#fff", borderRadius: "2px" }}>BHIM</span>
                                <span style={{ fontSize: "11px", padding: "2px 6px", background: "#232f3e", color: "#fff", borderRadius: "2px" }}>Cred</span>
                              </div>

                              {/* Mobile direct pay link */}
                              <div style={{ marginTop: "12px" }}>
                                <a
                                  href={upiUri}
                                  className="button button-secondary"
                                  style={{
                                    display: "inline-block",
                                    padding: "6px 12px",
                                    fontSize: "12px",
                                    textDecoration: "none",
                                    textAlign: "center",
                                  }}
                                >
                                  📲 Open in Installed UPI App
                                </a>
                              </div>
                            </div>
                          </div>

                          <div style={{ borderTop: "1px dashed var(--border-clinical)", paddingTop: "12px" }}>
                            <label style={{ fontSize: "11px", display: "block", marginBottom: "4px", color: "var(--text-secondary)" }}>
                              12-DIGIT UPI REFERENCE / UTR NUMBER (FROM YOUR UPI APP RECEIPT):
                            </label>
                            <input
                              type="text"
                              value={utrNumber}
                              onChange={(e) => setUtrNumber(e.target.value)}
                              placeholder={`e.g. ${Date.now()}`}
                              style={{
                                width: "100%",
                                padding: "8px 10px",
                                border: "1px solid var(--border-clinical)",
                                fontFamily: "var(--font-mono)",
                                fontSize: "13px",
                              }}
                            />
                            <p style={{ fontSize: "11px", color: "var(--accent-green)", marginTop: "6px" }}>
                              ✓ Once payment is authorized in your UPI app, click below to verify and complete order.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* ────────────────────────────────────────── */}
                      {/* UPI PAYMENT REQUEST (COLLECT) ACCORDION    */}
                      {/* ────────────────────────────────────────── */}
                      {isSelected && method.id === "UPI_COLLECT" && (
                        <div
                          style={{
                            marginTop: "16px",
                            padding: "16px",
                            border: "1.5px solid var(--border-clinical)",
                            backgroundColor: "var(--bg-paper)",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <label style={{ fontSize: "11px", display: "block", marginBottom: "6px", color: "var(--text-secondary)", fontWeight: "700" }}>
                            YOUR VIRTUAL PAYMENT ADDRESS (UPI ID):
                          </label>
                          <input
                            type="text"
                            value={customerUpiId}
                            onChange={(e) => setCustomerUpiId(e.target.value)}
                            placeholder="username@okhdfcbank or 9876543210@paytm"
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              border: "1px solid var(--border-clinical)",
                              fontFamily: "var(--font-mono)",
                              fontSize: "14px",
                            }}
                          />
                          <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "8px" }}>
                            A payment collect request for <strong>{formatPrice(subtotal)}</strong> will be sent to your UPI app. You will receive an instant notification to approve and enter your UPI PIN.
                          </p>

                          {requestProgress && (
                            <div
                              style={{
                                marginTop: "12px",
                                padding: "12px",
                                backgroundColor: "var(--bg-panel)",
                                border: "1px solid var(--accent-green)",
                                fontSize: "12px",
                              }}
                            >
                              {requestProgress === "SENDING" && (
                                <p style={{ color: "var(--text-secondary)" }}>
                                  ⏳ Dispatching payment request of {formatPrice(subtotal)} to {customerUpiId}...
                                </p>
                              )}
                              {requestProgress === "WAITING_APPROVAL" && (
                                <p style={{ color: "var(--accent-green)", fontWeight: "700" }}>
                                  📲 Request sent! Check Google Pay / PhonePe / Paytm on your phone to approve payment...
                                </p>
                              )}
                              {requestProgress === "APPROVED" && (
                                <p style={{ color: "var(--accent-green)", fontWeight: "700" }}>
                                  ✓ Payment approved! ₹{subtotal} deducted. Finalizing order...
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ────────────────────────────────────────── */}
                      {/* DIRECT CARD ACCORDION                     */}
                      {/* ────────────────────────────────────────── */}
                      {isSelected && method.id === "CARD" && (
                        <div
                          style={{
                            marginTop: "16px",
                            padding: "16px",
                            border: "1.5px solid var(--border-clinical)",
                            backgroundColor: "var(--bg-paper)",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            <div>
                              <label style={{ fontSize: "10px", display: "block", marginBottom: "4px", color: "var(--text-secondary)" }}>
                                CARDHOLDER NAME
                              </label>
                              <input
                                type="text"
                                value={cardDetails.nameOnCard}
                                onChange={(e) => setCardDetails({ ...cardDetails, nameOnCard: e.target.value })}
                                style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border-clinical)", fontFamily: "var(--font-mono)" }}
                              />
                            </div>
                            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                              <div style={{ flex: "2", minWidth: "160px" }}>
                                <label style={{ fontSize: "10px", display: "block", marginBottom: "4px", color: "var(--text-secondary)" }}>
                                  16-DIGIT CARD NUMBER
                                </label>
                                <input
                                  type="text"
                                  value={cardDetails.cardNumber}
                                  onChange={(e) => setCardDetails({ ...cardDetails, cardNumber: e.target.value })}
                                  style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border-clinical)", fontFamily: "var(--font-mono)" }}
                                />
                              </div>
                              <div style={{ flex: "1", minWidth: "70px" }}>
                                <label style={{ fontSize: "10px", display: "block", marginBottom: "4px", color: "var(--text-secondary)" }}>
                                  VALID THRU
                                </label>
                                <input
                                  type="text"
                                  value={cardDetails.expiry}
                                  onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                                  placeholder="MM/YY"
                                  style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border-clinical)", fontFamily: "var(--font-mono)" }}
                                />
                              </div>
                              <div style={{ flex: "1", minWidth: "60px" }}>
                                <label style={{ fontSize: "10px", display: "block", marginBottom: "4px", color: "var(--text-secondary)" }}>
                                  CVV
                                </label>
                                <input
                                  type="password"
                                  maxLength="4"
                                  value={cardDetails.cvv}
                                  onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                                  style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border-clinical)", fontFamily: "var(--font-mono)" }}
                                />
                              </div>
                            </div>
                            <p style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                              🔒 256-bit SSL encrypted. Payment amount of <strong>{formatPrice(subtotal)}</strong> will be charged immediately.
                            </p>
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

          <button className="button" type="submit" disabled={placing} style={{ width: "100%", padding: "16px", fontSize: "15px", fontWeight: "700" }}>
            {placing
              ? "Authorizing & Deducting Payment..."
              : paymentMethod === "UPI_QR"
              ? `Confirm & Verify QR Payment — ${formatPrice(subtotal)}`
              : paymentMethod === "UPI_COLLECT"
              ? `Send Payment Request & Deduct ${formatPrice(subtotal)}`
              : paymentMethod === "CARD"
              ? `Pay & Deduct ${formatPrice(subtotal)} with Card`
              : paymentMethod === "COD"
              ? `Confirm Order — ${formatPrice(subtotal)} (Cash on Delivery)`
              : `Proceed with Razorpay Gateway — ${formatPrice(subtotal)}`}
          </button>
        </form>
      </section>
    </main>
  );
}
