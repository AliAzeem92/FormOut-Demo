export type OrderStatus = "UNBOOKED" | "BOOKING_IN_PROGRESS" | "BOOKED" | "FAILED";

export interface Order {
  id: string;
  productName: string;
  price: number;
  quantity: number;
  notes?: string | null;
  imageUrl: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  city: string;
  status: OrderStatus;
  trackingNumber?: string | null;
  courierReference?: string | null;
  errorMessage?: string | null;
  bookedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}
