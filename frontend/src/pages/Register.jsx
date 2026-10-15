import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FormField from "../components/FormField";
import { registerCustomer } from "../services/api";

const initialForm = { fullName: "", email: "", password: "", phone: "" };

function validate(form) {
  const errors = {};

  for (const [field, value] of Object.entries(form)) {
    if (!value.trim()) errors[field] = "This field is required";
  }

  if (form.password && form.password.length < 6) {
    errors.password = "Password must be at least 6 characters long";
  }

  return errors;
}

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    setApiError("");

    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      await registerCustomer(form);
      navigate("/login");
    } catch (error) {
      setApiError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="register-title">
        <p className="eyebrow">NEW CUSTOMER // CREATE ACCOUNT</p>
        <h1 id="register-title" className="serif-heading">Create your account</h1>
        <p className="subtext">Sign up to track orders, save items to your wishlist, and checkout faster.</p>
        <form onSubmit={handleSubmit} noValidate>
          <FormField label="Full Name" name="fullName" value={form.fullName} onChange={handleChange} error={errors.fullName} />
          <FormField label="Email" name="email" type="email" value={form.email} onChange={handleChange} error={errors.email} />
          <FormField label="Password" name="password" type="password" value={form.password} onChange={handleChange} error={errors.password} />
          <FormField label="Phone Number" name="phone" type="tel" value={form.phone} onChange={handleChange} error={errors.phone} />
          {apiError && <p className="form-error" role="alert">{apiError}</p>}
          <button className="button" type="submit" disabled={submitting}>
            {submitting ? "Creating account..." : "Create Account"}
          </button>
        </form>
        <p className="auth-link">Already have an account? <Link to="/login">Log in</Link></p>
      </section>
    </main>
  );
}
