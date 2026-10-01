import { canonicalizeCity } from "./validations";

export interface PostExOrderInput {
  id: string;
  productName: string;
  price: number;
  quantity: number;
  notes?: string | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  city: string;
}

export interface PostExBookingResult {
  trackingNumber: string;
  courierReference: string | null;
}

export interface PostExCreateOrderPayload {
  orderRefNumber: string;
  invoicePayment: number;
  orderDetail: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  cityName: string;
  invoiceDivision: number;
  items: number;
  orderType: string;
  transactionNotes?: string;
  pickupAddressCode?: string;
}

/**
 * Pure function that maps an internal Order model to the official PostEx v3/create-order payload.
 * Canonicalizes city case-insensitively against CITY_VALUES.
 * Throws a readable error if the city does not match any operational delivery city.
 */
export function buildCreateOrderPayload(order: PostExOrderInput): PostExCreateOrderPayload {
  const canonicalCity = canonicalizeCity(order.city);
  if (!canonicalCity) {
    throw new Error(
      `City '${order.city}' is not in the PostEx city list. Create a new order with a valid city.`
    );
  }

  const payload: PostExCreateOrderPayload = {
    orderRefNumber: order.id,
    invoicePayment: Number(order.price) * Number(order.quantity), // ASSUMPTION: COD amount = price x quantity
    orderDetail: `${order.productName} x ${order.quantity}`,
    customerName: order.customerName.trim(),
    customerPhone: order.customerPhone.trim(),
    deliveryAddress: order.customerAddress.trim(),
    cityName: canonicalCity,
    invoiceDivision: 1, // ASSUMPTION: default 1 packaging division
    items: Number(order.quantity),
    orderType: "Normal",
  };

  if (order.notes && order.notes.trim()) {
    payload.transactionNotes = order.notes.trim();
  }

  const pickupAddressCode = process.env.POSTEX_PICKUP_ADDRESS_CODE?.trim();
  if (pickupAddressCode) {
    payload.pickupAddressCode = pickupAddressCode;
  }

  return payload;
}

/**
 * Books an order with PostEx courier service.
 * In MOCK mode (MOCK_COURIER=true): simulates dispatch with a realistic delay and generates mock tracking details.
 * In REAL mode: calls POST /services/integration/api/order/v3/create-order with an AbortController timeout.
 */
export async function bookWithPostEx(order: PostExOrderInput): Promise<PostExBookingResult> {
  const isMock = process.env.MOCK_COURIER === "true";

  // ==========================================
  // 1. MOCK PATH (Isolated for Demo & Testing)
  // ==========================================
  if (isMock) {
    // Validate city canonicalization in mock mode too
    buildCreateOrderPayload(order);

    // Simulate real courier network latency (~1.5s)
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // DEMO-ONLY failure trigger: if notes contain "[fail]" (case-insensitive), simulate rejection
    if (order.notes && order.notes.toLowerCase().includes("[fail]")) {
      throw new Error("Mock courier rejected this order (test failure)");
    }

    // Generate clearly marked mock courier identifiers
    const random8Digits = Math.floor(10000000 + Math.random() * 90000000);
    const trackingNumber = `MOCK-${random8Digits}`;
    const courierReference = `PX-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    return {
      trackingNumber,
      courierReference,
    };
  }

  // ==========================================
  // 2. REAL PATH (PostEx Merchant API v3)
  // ==========================================
  const rawToken = process.env.POSTEX_API_TOKEN;
  const token = rawToken ? rawToken.trim() : "";
  if (!token) {
    // Missing token: clear message handled by dispatch route to revert order to UNBOOKED
    throw new Error("PostEx token is not set. Add POSTEX_API_TOKEN to .env.local.");
  }

  // Pre-network validation & payload construction (fails before any network call if city is invalid)
  const payload = buildCreateOrderPayload(order);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  let response: Response;
  try {
    response = await fetch(
      "https://api.postex.pk/services/integration/api/order/v3/create-order",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }
    );
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        "PostEx did not respond in time. Check your PostEx dashboard before retrying to avoid a duplicate order."
      );
    }
    throw new Error("Could not reach PostEx. Check your internet connection and retry.");
  } finally {
    clearTimeout(timeoutId);
  }

  interface PostExApiResponse {
    statusCode?: string | number;
    statusMessage?: string;
    dist?: {
      trackingNumber?: string;
      orderStatus?: string;
      orderDate?: string;
    };
  }

  let data: PostExApiResponse | null = null;
  try {
    data = (await response.json()) as PostExApiResponse;
  } catch {
    // Response not JSON
  }

  const statusMessage =
    typeof data?.statusMessage === "string" ? data.statusMessage.trim() : "";

  // Server log: ONLY HTTP status and statusMessage, NEVER token or request headers
  console.log(
    `[PostEx Create Order Response] HTTP ${response.status}, statusCode: ${data?.statusCode ?? "N/A"}, statusMessage: ${statusMessage || "N/A"}`
  );

  const trackingNumber = data?.dist?.trackingNumber ? String(data.dist.trackingNumber).trim() : "";

  const isSuccess =
    response.ok &&
    String(data?.statusCode) === "200" &&
    trackingNumber.length > 0;

  if (!isSuccess) {
    if (statusMessage) {
      throw new Error(statusMessage.slice(0, 200));
    }
    throw new Error(`PostEx rejected the order (HTTP ${response.status}).`);
  }

  return {
    trackingNumber,
    courierReference: null, // PostEx returns no separate courierReference
  };
}
