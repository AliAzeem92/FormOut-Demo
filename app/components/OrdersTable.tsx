/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import {
  PackageOpen,
  Send,
  RotateCw,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { Order } from "../types";

interface OrdersTableProps {
  orders: Order[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onOpenCreateModal: () => void;
  onShowInfoToast: (msg: string) => void;
  onDispatch: (orderId: string) => void;
}

export function OrdersTable({
  orders,
  isLoading,
  error,
  onRefresh,
  onOpenCreateModal,
  onDispatch,
}: OrdersTableProps) {

  // Helper for Status Badge
  const renderStatusBadge = (order: Order) => {
    switch (order.status) {
      case "UNBOOKED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pending
          </span>
        );
      case "BOOKING_IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            Sending...
          </span>
        );
      case "BOOKED":
        return (
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 w-fit">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Sent to PostEx
            </span>
            {order.trackingNumber && (
              <span className="text-[11px] text-slate-500 font-mono">
                Tracking: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-semibold">{order.trackingNumber}</code>
              </span>
            )}
          </div>
        );
      case "FAILED":
        return (
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 w-fit">
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              Failed
            </span>
            {order.errorMessage && (
              <span className="text-[11px] text-rose-600 max-w-xs truncate" title={order.errorMessage}>
                {order.errorMessage}
              </span>
            )}
          </div>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            <HelpCircle className="w-3.5 h-3.5" />
            {order.status}
          </span>
        );
    }
  };

  // Helper for Action Button
  const renderActionButton = (order: Order, isMobile: boolean = false) => {
    const sizeClasses = isMobile
      ? "min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl"
      : "min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-lg";

    switch (order.status) {
      case "UNBOOKED":
        return (
          <button
            onClick={() => onDispatch(order.id)}
            className={`inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs transition-colors cursor-pointer ${sizeClasses}`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send to PostEx</span>
          </button>
        );
      case "BOOKING_IN_PROGRESS":
        return (
          <button
            disabled
            className={`inline-flex items-center gap-1.5 bg-slate-100 text-slate-400 cursor-not-allowed ${sizeClasses}`}
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Sending...</span>
          </button>
        );
      case "BOOKED":
        return null; // Tracking number already rendered in Status column
      case "FAILED":
        return (
          <button
            onClick={() => onDispatch(order.id)}
            className={`inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 transition-colors cursor-pointer ${sizeClasses}`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        );
      default:
        return null;
    }
  };

  // 1. Loading Skeleton State
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 w-36 bg-slate-200 animate-pulse rounded-md" />
          <div className="h-9 w-28 bg-slate-200 animate-pulse rounded-lg" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-slate-100 animate-pulse rounded-xl flex items-center px-4 justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-200 rounded-lg" />
                <div className="space-y-2">
                  <div className="h-4 w-40 bg-slate-200 rounded-sm" />
                  <div className="h-3 w-24 bg-slate-200 rounded-sm" />
                </div>
              </div>
              <div className="h-8 w-24 bg-slate-200 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. Error State with Retry
  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">Failed to load orders</h3>
        <p className="text-sm text-slate-500 mb-4">{error}</p>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  // 3. Empty State
  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
          <PackageOpen className="w-8 h-8 stroke-[1.5]" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">No orders yet</h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
          You haven&apos;t recorded any customer orders yet. Create your first order to get started.
        </p>
        <button
          onClick={onOpenCreateModal}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer"
        >
          Create your first order
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Recent Orders ({orders.length})
          </h2>
          <p className="text-xs text-slate-500">
            Live orders synced with your database
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all cursor-pointer"
          title="Refresh orders list"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Desktop Table View (>= 768px) */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Product</th>
                <th className="py-3.5 px-4">Price</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">City</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  {/* Product Column */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={order.imageUrl}
                        alt={order.productName}
                        className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-50"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900 truncate">
                            {order.productName}
                          </p>
                          {order.quantity > 1 && (
                            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              x{order.quantity}
                            </span>
                          )}
                        </div>
                        {order.notes && (
                          <p className="text-xs text-slate-400 italic truncate max-w-xs">
                            &ldquo;{order.notes}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Price Column */}
                  <td className="py-4 px-4 font-semibold text-slate-900 whitespace-nowrap">
                    Rs. {order.price.toLocaleString()}
                  </td>

                  {/* Customer Column */}
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-medium text-slate-900 leading-tight">
                        {order.customerName}
                      </p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {order.customerPhone}
                      </p>
                      <p className="text-xs text-slate-400 truncate max-w-xs mt-0.5" title={order.customerAddress}>
                        {order.customerAddress}
                      </p>
                    </div>
                  </td>

                  {/* City Column */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                      {order.city}
                    </span>
                  </td>

                  {/* Status Column */}
                  <td className="py-4 px-4">
                    {renderStatusBadge(order)}
                  </td>

                  {/* Action Column */}
                  <td className="py-4 px-4 text-right whitespace-nowrap">
                    {renderActionButton(order)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Stacked Card View (< 768px) */}
      <div className="md:hidden space-y-3">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3"
          >
            {/* Top row: Image, Product, Price */}
            <div className="flex items-start gap-3">
              <img
                src={order.imageUrl}
                alt={order.productName}
                className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-50"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-900 text-sm truncate">
                    {order.productName}
                  </h3>
                  <span className="font-bold text-slate-900 text-sm whitespace-nowrap">
                    Rs. {order.price.toLocaleString()}
                  </span>
                </div>
                {order.quantity > 1 && (
                  <span className="inline-block mt-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                    Quantity: {order.quantity}
                  </span>
                )}
                {order.notes && (
                  <p className="text-xs text-slate-400 italic mt-0.5 truncate">
                    &ldquo;{order.notes}&rdquo;
                  </p>
                )}
              </div>
            </div>

            {/* Middle row: Customer details */}
            <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-medium text-slate-900">{order.customerName}</span>
                <span className="font-mono text-slate-600">{order.customerPhone}</span>
              </div>
              <p className="text-slate-500 line-clamp-1">{order.customerAddress}</p>
              <div className="pt-1 flex items-center gap-1.5">
                <span className="text-slate-400">City:</span>
                <span className="font-semibold text-slate-700">{order.city}</span>
              </div>
            </div>

            {/* Bottom row: Status and Action */}
            <div className="flex flex-wrap items-center justify-between pt-2.5 gap-2 border-t border-slate-100">
              <div className="min-w-0">
                {renderStatusBadge(order)}
              </div>
              <div className="shrink-0">
                {renderActionButton(order, true)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
