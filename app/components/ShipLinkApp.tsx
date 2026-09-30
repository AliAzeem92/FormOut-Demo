"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "./Header";
import { OrdersTable } from "./OrdersTable";
import { CreateOrderModal } from "./CreateOrderModal";
import { ToastContainer } from "./Toast";
import { Order, Toast as ToastType } from "../types";

interface ShipLinkAppProps {
  isMockCourier: boolean;
}

export function ShipLinkApp({ isMockCourier }: ShipLinkAppProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastType[]>([]);

  // Toast Helpers
  const addToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "info") => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Initial load
  useEffect(() => {
    let ignore = false;
    async function loadInitialOrders() {
      try {
        const res = await fetch("/api/orders", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Server returned status ${res.status}`);
        }
        const data = await res.json();
        if (!ignore) {
          setOrders(data.orders || []);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : "Failed to load orders.";
          setFetchError(msg);
          setIsLoading(false);
        }
      }
    }

    loadInitialOrders();
    return () => {
      ignore = true;
    };
  }, []);

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load orders.";
      setFetchError(msg);
      addToast(msg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // When an order is dispatched to PostEx
  const handleDispatch = async (orderId: string) => {
    // Immediately reflect sending state in UI to eliminate double-clicks
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, status: "BOOKING_IN_PROGRESS" } : o
      )
    );

    try {
      const res = await fetch(`/api/orders/${orderId}/dispatch`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok && data.order) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? data.order : o))
        );
        addToast(data.message || "Order sent to PostEx successfully!", "success");
      } else {
        if (data.order) {
          setOrders((prev) =>
            prev.map((o) => (o.id === orderId ? data.order : o))
          );
        } else {
          // Re-fetch to ensure sync
          handleRefresh();
        }
        addToast(data.error || "Failed to dispatch order to PostEx.", "error");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error during dispatch.";
      addToast(msg, "error");
      handleRefresh();
    }
  };

  // Reactive polling: Poll /api/orders every 3s ONLY while at least one order is BOOKING_IN_PROGRESS
  useEffect(() => {
    const hasInProgress = orders.some((o) => o.status === "BOOKING_IN_PROGRESS");
    if (!hasInProgress) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/orders", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.orders) {
            setOrders(data.orders);
          }
        }
      } catch {
        // Silently ignore background polling errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [orders]);

  // When a new order is created, prepend it directly to table
  const handleOrderCreated = (newOrder: Order) => {
    setOrders((prev) => [newOrder, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Header */}
      <Header
        isMockCourier={isMockCourier}
        onOpenCreateModal={() => setIsModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <OrdersTable
          orders={orders}
          isLoading={isLoading}
          error={fetchError}
          onRefresh={handleRefresh}
          onOpenCreateModal={() => setIsModalOpen(true)}
          onShowInfoToast={(msg) => addToast(msg, "info")}
          onDispatch={handleDispatch}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        <p>FormOut Proof-of-Concept • Single-Page Pakistani Social Commerce Courier Dispatch</p>
      </footer>

      {/* Create Order Modal */}
      <CreateOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onOrderCreated={handleOrderCreated}
        onErrorToast={(msg) => addToast(msg, "error")}
        onSuccessToast={(msg) => addToast(msg, "success")}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
