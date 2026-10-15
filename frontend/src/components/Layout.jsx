import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function Layout() {
  return (
    <div className="clinical-app-root">
      <Navbar />
      <Outlet />
      <Footer />
    </div>
  );
}
