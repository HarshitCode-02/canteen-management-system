import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import OrderStatusNotifications from "./OrderStatusNotifications";
import Footer from "./Footer";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user } = useAuth();
  const showStudentFooter = ["student", "teacher"].includes(user?.role);

  return (
    <div className="app-shell">
      <Navbar />
      <OrderStatusNotifications />
      <main className="container app-main">
        <Outlet />
      </main>
      {showStudentFooter && <Footer />}
    </div>
  );
}