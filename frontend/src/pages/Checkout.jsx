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

    setPlacing(true);
    try {
      const trimmedForm = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, String(v).trim()])
      );
      const paymentData = await createPaymentOrder(trimmedForm);

      const loaded = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
      if (!loaded) {
        setErrorMessage("Unable to load Razorpay. Please disable ad-blockers and try again.");
        return;
      }

      const paymentObject = new window.Razorpay({
        key: paymentData.key,
        amount: paymentData.amount,
        currency: paymentData.currency,
        order_id: paymentData.razorpayOrderId,
        name: "ShopKart",
        description: "ShopKart Order",
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
          "Payment failed. Please try again.";
        setErrorMessage(reason);
        setPlacing(false);
      });

      paymentObject.open();
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
        <p className="eyebrow">CHECKOUT // ORDER DETAILS</p>
        <h1 id="checkout-title" className="serif-heading">Checkout</h1>

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

        <form className="checkout-form" onSubmit={handleSubmit} noValidate>
          <h2 className="serif-heading">Shipping Address</h2>
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
          {errorMessage && (
            <p className="form-error" role="alert">{errorMessage}</p>
          )}
          <button className="button" type="submit" disabled={placing}>
            {placing ? "Placing order..." : "Place Order"}
          </button>
        </form>
      </section>
    </main>
  );
}