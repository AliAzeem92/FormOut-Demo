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
  courierReference: string;
}

/**
 * Books an order with PostEx courier service.
 * In MOCK mode (MOCK_COURIER=true), simulates dispatch with a realistic delay and generates mock tracking details.
 * In REAL mode, acts as a safe stub until official PostEx API documentation is verified.
 */
export async function bookWithPostEx(order: PostExOrderInput): Promise<PostExBookingResult> {
  const isMock = process.env.MOCK_COURIER === "true";

  // ==========================================
  // 1. MOCK PATH (Isolated for Demo & Testing)
  // ==========================================
  if (isMock) {
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
  // 2. REAL PATH (Safe Stub)
  // ==========================================
  const token = process.env.POSTEX_API_TOKEN;
  if (!token || token.trim() === "") {
    // Token is missing: throw readable error without exposing any internal details
    throw new Error("PostEx token is not set. Add POSTEX_API_TOKEN to .env.local.");
  }

  /*
   * TODO: PostEx Real API Integration Checklist
   * When official PostEx API documentation is provided, implement the real network request here:
   * 1. Official endpoint URL (Staging / Production order booking endpoint).
   * 2. Authentication header convention (e.g. 'token', 'Authorization: Bearer <token>', or 'api-key').
   * 3. Required payload structure:
   *    - Merchant pickup address code / operational warehouse origin.
   *    - Order transaction type (e.g. COD invoice amount vs prepaid).
   *    - Official operational city naming convention.
   *    - Customer delivery coordinates or address line conventions.
   * 4. Verified response schema (tracking ID property name, reference code, status codes).
   * 
   * SECURITY NOTICE: Ensure the POSTEX_API_TOKEN is never logged to stdout/stderr or returned in error bodies.
   */

  throw new Error("PostEx real integration is not configured until verified API documentation is provided.");
}
