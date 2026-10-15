import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { customer } = useAuth();

  if (!customer) return null;

  return (
    <main className="auth-page">
      <section className="profile-card" aria-labelledby="home-title">
        <p className="eyebrow">CUSTOMER PROFILE // ACCOUNT</p>
        <h1 id="home-title" className="serif-heading">Welcome, {customer.fullName}</h1>
        <p className="subtext">Your ShopKart account details and contact information.</p>
        <dl className="profile-details">
          <div>
            <dt>Customer Name</dt>
            <dd>{customer.fullName}</dd>
          </div>
          <div>
            <dt>Email Address</dt>
            <dd className="tabular-nums">{customer.email}</dd>
          </div>
          <div>
            <dt>Phone Number</dt>
            <dd className="tabular-nums">{customer.phone}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
