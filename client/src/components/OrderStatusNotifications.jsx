import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../api";
import { useAuth } from "../context/AuthContext";
import { connectSocket } from "../socket";

const STATUS_MESSAGES = {
  placed: "was confirmed",
  preparing: "is being prepared",
  ready: "is ready for pickup",
  cancelled: "was cancelled",
  collected: "was collected",
  no_show: "was marked as not collected. Visit the canteen to explain what happened and request a staff review",
};

export default function OrderStatusNotifications() {
  const { user } = useAuth();
  const previousStatuses = useRef(null);
  const [notice, setNotice] = useState("");
  const [refreshError, setRefreshError] = useState("");

  useEffect(() => {
    if (!user?._id) return undefined;
    let active = true;
    let inFlight = false;
    previousStatuses.current = null;

    const refresh = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const result = await api.get("/orders/my");
        if (!active) return;
        const orders = result.data;
        if (!Array.isArray(orders)) throw new Error("Order list response is invalid");
        const nextStatuses = new Map(orders.map((order) => [order._id, order.status]));
        let changedOrder;
        if (previousStatuses.current) {
          changedOrder = orders.find((order) =>
            previousStatuses.current.get(order._id) !== undefined &&
            previousStatuses.current.get(order._id) !== order.status
          );
        }
        previousStatuses.current = nextStatuses;
        setRefreshError("");
        window.dispatchEvent(new CustomEvent("campusbites:orders-updated", { detail: orders }));
        if (changedOrder) {
          const change = STATUS_MESSAGES[changedOrder.status] || "was updated";
          const message = `Order #${changedOrder.orderNumber} ${change}.`;
          setNotice(message);
          if (
            changedOrder.status === "ready" &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            try {
              new Notification(message, { body: "Check My Orders for your pickup details." });
            } catch {
              setRefreshError("Order is ready. The browser alert could not be shown; the in-site notice is available.");
            }
          }
        }
      } catch (err) {
        if (active) setRefreshError(`Order status could not be refreshed. ${errorMessage(err)}`);
      } finally {
        inFlight = false;
      }
    };

    // Load once, then poll as the Vercel serverless deployment does not host Socket.IO.
    void refresh();
    const timer = setInterval(refresh, 30000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const socket = connectSocket();
    socket?.on("connect", refresh);
    socket?.on("orderUpdated", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      active = false;
      clearInterval(timer);
      socket?.off("connect", refresh);
      socket?.off("orderUpdated", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [user?._id]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 8000);
    return () => clearTimeout(timer);
  }, [notice]);

  if (!notice && !refreshError) return null;

  return (
    <div className={`order-notification${refreshError ? " order-notification-error" : ""}`} role="status" aria-live="polite">
      <span>{refreshError || notice}</span>
      {notice && !refreshError && (
        <div className="order-notification-actions">
          <Link to="/orders">View</Link>
          <button type="button" className="small" aria-label="Dismiss order notification" onClick={() => setNotice("")}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
