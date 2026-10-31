import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import OrderStatusNotifications from "./OrderStatusNotifications";

export default function Layout() {
  return (
    <>
      <Navbar />
      <OrderStatusNotifications />
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}