"use client";

import React from "react";
import { Package, Plus } from "lucide-react";

interface HeaderProps {
  isMockCourier: boolean;
  onOpenCreateModal: () => void;
}

export function Header({ isMockCourier, onOpenCreateModal }: HeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-3">
        {/* Logo and Titles */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 truncate">
                ShipLink
              </h1>
              {isMockCourier ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Sandbox mode
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live mode
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 hidden sm:block truncate">
              Single-Page PostEx Courier Dispatch for Social Sellers
            </p>
          </div>
        </div>

        {/* Action Button with 44px min tap target */}
        <div className="shrink-0">
          <button
            onClick={onOpenCreateModal}
            className="min-h-[44px] inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold px-3.5 sm:px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create New Order</span>
          </button>
        </div>
      </div>
    </header>
  );
}
