/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, UploadCloud, Loader2, AlertCircle } from "lucide-react";
import { CITIES } from "@/lib/cities";
import { canonicalizeCity, createOrderSchema } from "@/lib/validations";
import { Order } from "../types";

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (newOrder: Order) => void;
  onErrorToast: (msg: string) => void;
  onSuccessToast: (msg: string) => void;
}

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export function CreateOrderModal({
  isOpen,
  onClose,
  onOrderCreated,
  onErrorToast,
  onSuccessToast,
}: CreateOrderModalProps) {
  // Form fields state
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [cityInput, setCityInput] = useState("");

  // File state & preview
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // UI status & error state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  // Clean up object URLs on unmount / change
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!isOpen) return null;

  // Handle File Selection with instant validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFieldErrors((prev) => ({ ...prev, imageUrl: "" }));
    setGeneralError(null);

    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setFieldErrors((prev) => ({
        ...prev,
        imageUrl: "Invalid file type. Only JPEG, PNG, and WebP are allowed.",
      }));
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setFieldErrors((prev) => ({
        ...prev,
        imageUrl: `File size exceeds 5 MB (${(file.size / (1024 * 1024)).toFixed(2)} MB).`,
      }));
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resetForm = () => {
    setProductName("");
    setPrice("");
    setQuantity("1");
    setNotes("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setCityInput("");
    handleRemoveImage();
    setFieldErrors({});
    setGeneralError(null);
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setFieldErrors({});
    setGeneralError(null);

    // 1. Client-side Image Check
    if (!selectedFile) {
      setFieldErrors((prev) => ({
        ...prev,
        imageUrl: "Product image is required.",
      }));
      return;
    }

    // 2. Client-side Zod Validation (Pre-Upload)
    const clientValidation = createOrderSchema.safeParse({
      productName,
      price: price ? Number(price) : "",
      quantity: quantity ? Number(quantity) : 1,
      notes: notes || null,
      imageUrl: "https://placeholder.invalid/temp.webp",
      customerName,
      customerPhone,
      customerAddress,
      city: cityInput,
    });

    if (!clientValidation.success) {
      const flatErrors = clientValidation.error.flatten().fieldErrors;
      const formatted: Record<string, string> = {};
      for (const [key, messages] of Object.entries(flatErrors)) {
        if (key !== "imageUrl" && messages && messages.length > 0) {
          formatted[key] = messages[0];
        }
      }
      setFieldErrors(formatted);
      return;
    }

    setIsSubmitting(true);

    try {
      // 3. Upload Image to /api/upload
      const uploadFormData = new FormData();
      uploadFormData.append("file", selectedFile);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok || !uploadData.url) {
        throw new Error(uploadData.error || "Image upload failed. Please try again.");
      }

      const uploadedWebpUrl = uploadData.url;

      // 4. Save Order to /api/orders (submitting canonical official city name)
      const orderPayload = {
        productName: productName.trim(),
        price: Number(price),
        quantity: Number(quantity),
        notes: notes.trim() || null,
        imageUrl: uploadedWebpUrl,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        city: clientValidation.data.city,
      };

      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        if (orderData.details) {
          const serverFieldErrors: Record<string, string> = {};
          for (const [key, msgs] of Object.entries(orderData.details)) {
            if (Array.isArray(msgs) && msgs.length > 0) {
              serverFieldErrors[key] = msgs[0];
            }
          }
          setFieldErrors(serverFieldErrors);
          throw new Error("Validation failed. Please correct highlighted fields.");
        }
        throw new Error(orderData.error || "Failed to create order.");
      }

      // Success!
      onSuccessToast("Order created successfully!");
      onOrderCreated(orderData.order);
      resetForm();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setGeneralError(msg);
      onErrorToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Modal Dialog Card: constrained height with internal scrolling */}
      <div
        ref={modalContainerRef}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden relative max-h-[92vh] flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Sticky Modal Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-100 bg-slate-50/75">
          <div className="min-w-0 pr-2">
            <h2 id="modal-title" className="text-base sm:text-lg font-bold text-slate-900 truncate">
              Create New Order
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              Enter customer and product information to prepare for PostEx dispatch
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          id="create-order-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5"
        >
          {generalError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              <span>{generalError}</span>
            </div>
          )}

          {/* Product Image Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Product Image <span className="text-rose-500">*</span>
            </label>
            <div className="mt-1">
              {previewUrl ? (
                <div className="relative border border-slate-200 rounded-xl p-3 bg-slate-50 flex items-center gap-3 sm:gap-4">
                  <img
                    src={previewUrl}
                    alt="Product preview"
                    className="w-18 h-18 sm:w-20 sm:h-20 object-cover rounded-lg border border-slate-200 shadow-xs shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {selectedFile?.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {(selectedFile?.size ? selectedFile.size / 1024 : 0).toFixed(1)} KB • Delivered as WebP
                    </p>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      disabled={isSubmitting}
                      className="min-h-[36px] inline-flex items-center text-xs font-semibold text-rose-600 hover:text-rose-700 mt-1 hover:underline disabled:opacity-50 cursor-pointer"
                    >
                      Remove and choose different image
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 sm:p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                    fieldErrors.imageUrl
                      ? "border-rose-300 bg-rose-50/30"
                      : "border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 bg-slate-50/40"
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-2">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800">
                    Click to upload product image
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    PNG, JPEG, or WebP up to 5 MB (converted to WebP)
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
                disabled={isSubmitting}
              />
              {fieldErrors.imageUrl && (
                <p className="text-xs text-rose-600 mt-1.5 font-medium">
                  {fieldErrors.imageUrl}
                </p>
              )}
            </div>
          </div>

          {/* Product Details Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Product Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Product Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lawn Embroidered Suit"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  disabled={isSubmitting}
                  className={`w-full min-h-[44px] text-sm px-3.5 py-2.5 rounded-xl border bg-white text-slate-900 transition-colors focus:outline-none focus:ring-2 ${
                    fieldErrors.productName
                      ? "border-rose-300 focus:ring-rose-500/20 focus:border-rose-500"
                      : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
                  }`}
                />
                {fieldErrors.productName && (
                  <p className="text-xs text-rose-600 mt-1">{fieldErrors.productName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Quantity <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  disabled={isSubmitting}
                  className={`w-full min-h-[44px] text-sm px-3.5 py-2.5 rounded-xl border bg-white text-slate-900 transition-colors focus:outline-none focus:ring-2 ${
                    fieldErrors.quantity
                      ? "border-rose-300 focus:ring-rose-500/20 focus:border-rose-500"
                      : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
                  }`}
                />
                {fieldErrors.quantity && (
                  <p className="text-xs text-rose-600 mt-1">{fieldErrors.quantity}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Price (PKR) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-xs font-semibold text-slate-400">
                    Rs.
                  </span>
                  <input
                    type="number"
                    min="1"
                    placeholder="2500"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    disabled={isSubmitting}
                    className={`w-full min-h-[44px] text-sm pl-10 pr-3.5 py-2.5 rounded-xl border bg-white text-slate-900 transition-colors focus:outline-none focus:ring-2 ${
                      fieldErrors.price
                        ? "border-rose-300 focus:ring-rose-500/20 focus:border-rose-500"
                        : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
                    }`}
                  />
                </div>
                {fieldErrors.price && (
                  <p className="text-xs text-rose-600 mt-1">{fieldErrors.price}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Order Notes <span className="text-slate-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Call before delivery"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full min-h-[44px] text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Customer & Shipping Section */}
          <div className="space-y-4 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Customer & Delivery Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Customer Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ayesha Malik"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  disabled={isSubmitting}
                  className={`w-full min-h-[44px] text-sm px-3.5 py-2.5 rounded-xl border bg-white text-slate-900 transition-colors focus:outline-none focus:ring-2 ${
                    fieldErrors.customerName
                      ? "border-rose-300 focus:ring-rose-500/20 focus:border-rose-500"
                      : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
                  }`}
                />
                {fieldErrors.customerName && (
                  <p className="text-xs text-rose-600 mt-1">{fieldErrors.customerName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Phone (Pakistani format) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="03001234567"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  disabled={isSubmitting}
                  className={`w-full min-h-[44px] text-sm px-3.5 py-2.5 rounded-xl border bg-white text-slate-900 transition-colors focus:outline-none focus:ring-2 ${
                    fieldErrors.customerPhone
                      ? "border-rose-300 focus:ring-rose-500/20 focus:border-rose-500"
                      : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
                  }`}
                />
                {fieldErrors.customerPhone ? (
                  <p className="text-xs text-rose-600 mt-1">{fieldErrors.customerPhone}</p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1">
                    11 digits starting with 03 (dashes allowed)
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Full Delivery Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="House #, Street, Area / Sector"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  disabled={isSubmitting}
                  className={`w-full min-h-[44px] text-sm px-3.5 py-2.5 rounded-xl border bg-white text-slate-900 transition-colors focus:outline-none focus:ring-2 ${
                    fieldErrors.customerAddress
                      ? "border-rose-300 focus:ring-rose-500/20 focus:border-rose-500"
                      : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
                  }`}
                />
                {fieldErrors.customerAddress && (
                  <p className="text-xs text-rose-600 mt-1">{fieldErrors.customerAddress}</p>
                )}
              </div>

              <div>
                <label htmlFor="city-input" className="block text-xs font-medium text-slate-700 mb-1">
                  City <span className="text-rose-500">*</span>
                </label>
                <input
                  id="city-input"
                  type="text"
                  list="postex-cities-list"
                  value={cityInput}
                  onChange={(e) => {
                    setCityInput(e.target.value);
                    if (fieldErrors.city) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.city;
                        return next;
                      });
                    }
                  }}
                  onBlur={() => {
                    const canonical = canonicalizeCity(cityInput);
                    if (canonical) {
                      setCityInput(canonical);
                    }
                  }}
                  placeholder="Type city name (e.g. Lahore, Karachi)"
                  disabled={isSubmitting}
                  className={`w-full min-h-[44px] text-sm px-3.5 py-2.5 rounded-xl border bg-white text-slate-900 transition-colors focus:outline-none focus:ring-2 ${
                    fieldErrors.city
                      ? "border-rose-300 focus:ring-rose-500/20 focus:border-rose-500"
                      : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
                  }`}
                />
                <datalist id="postex-cities-list">
                  {CITIES.map((c) => (
                    <option key={c.value} value={c.value} />
                  ))}
                </datalist>
                {fieldErrors.city && (
                  <p className="text-xs text-rose-600 mt-1">{fieldErrors.city}</p>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Anchored Modal Footer with always-reachable submit button */}
        <div className="flex-shrink-0 flex items-center justify-end gap-3 px-5 py-3.5 sm:px-6 sm:py-4 border-t border-slate-100 bg-slate-50/75">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-[44px] px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-order-form"
            disabled={isSubmitting}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer min-w-36"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Order...</span>
              </>
            ) : (
              <span>Place Order</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
