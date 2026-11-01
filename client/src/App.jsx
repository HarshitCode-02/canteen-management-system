import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import PublicLayout from "./components/PublicLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CanteenList from "./pages/CanteenList";
import CanteenMenu from "./pages/CanteenMenu";
import MyOrders from "./pages/MyOrders";
import Cart from "./pages/Cart";
import Dashboard from "./pages/Dashboard";
import ManageMenu from "./pages/ManageMenu";
import AdminPanel from "./pages/AdminPanel";
import BlockedStudents from "./pages/BlockedStudents";
import SalesReport from "./pages/SalesReport";
import AccountSettings from "./pages/AccountSettings";
import Discover from "./pages/Discover";
import ReviewModeration from "./pages/ReviewModeration";
import AdminAuditLogs from "./pages/AdminAuditLogs";
import InfoPage from "./pages/InfoPage";
import SearchPage from "./pages/SearchPage";



export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/help/how-to-order" element={<InfoPage />} />
        <Route path="/help/pickup" element={<InfoPage />} />
        <Route path="/help/faq" element={<InfoPage />} />
        <Route path="/contact" element={<InfoPage />} />
        <Route path="/privacy" element={<InfoPage />} />
        <Route path="/terms" element={<InfoPage />} />
        <Route path="/payment-info" element={<InfoPage />} />
      </Route>
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<CanteenList />} />
        <Route path="/canteens" element={<CanteenList />} />
        <Route path="/canteen/:id" element={<CanteenMenu />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/orders" element={<MyOrders />} />
        <Route path="/account" element={<AccountSettings />} />
        <Route
          path="/discover"
          element={
            <ProtectedRoute roles={["student", "teacher"]}>
              <Discover />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminPanel />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reviews"
          element={
            <ProtectedRoute roles={["admin"]}>
              <ReviewModeration />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminAuditLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={["canteen", "admin"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manage-menu"
          element={
            <ProtectedRoute roles={["canteen", "admin"]}>
              <ManageMenu />
            </ProtectedRoute>
          }
        />
        <Route
          path="/blocked"
          element={
            <ProtectedRoute roles={["canteen", "admin"]}>
              <BlockedStudents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/report"
          element={
            <ProtectedRoute roles={["canteen", "admin"]}>
              <SalesReport />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}