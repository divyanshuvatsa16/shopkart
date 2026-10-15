import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import FormField from "../components/FormField";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!form.email.trim()) nextErrors.email = "Email is required";
    if (!form.password) nextErrors.password = "Password is required";
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      await login(form);
      const fromPath = location.state?.from?.pathname;
      const fromSearch = location.state?.from?.search || "";
      const destination = fromPath ? `${fromPath}${fromSearch}` : "/products";
      navigate(destination, { replace: true });
    } catch {
      setErrors({ form: "Invalid Credentials" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <p className="eyebrow">CUSTOMER ACCOUNT // SIGN IN</p>
        <h1 id="login-title" className="serif-heading">Log in to ShopKart</h1>
        <p className="subtext">Enter your credentials to access your account, orders, and saved wishlist.</p>
        <form onSubmit={handleSubmit} noValidate>
          <FormField label="Email" name="email" type="email" value={form.email} onChange={handleChange} error={errors.email} />
          <FormField label="Password" name="password" type="password" value={form.password} onChange={handleChange} error={errors.password} />
          {errors.form && <p className="form-error" role="alert">{errors.form}</p>}
          <button className="button" type="submit" disabled={submitting}>
            {submitting ? "Authenticating..." : "Login"}
          </button>
        </form>
        <p className="auth-link">New to ShopKart? <Link to="/register">Create an account</Link></p>
      </section>
    </main>
  );
}
