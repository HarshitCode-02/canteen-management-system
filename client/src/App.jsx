import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
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



export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<CanteenList />} />
        <Route path="/canteen/:id" element={<CanteenMenu />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/orders" element={<MyOrders />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminPanel />
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
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}