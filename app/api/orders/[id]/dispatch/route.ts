import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bookWithPostEx } from "@/lib/postex";

// MongoDB ObjectId is a 24-character hexadecimal string
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // 1. Validate ID format
  if (!id || !OBJECT_ID_REGEX.test(id)) {
    return NextResponse.json(
      { error: "Invalid order ID format." },
      { status: 400 }
    );
  }

  // 2. Fetch existing order to verify existence
  const existingOrder = await prisma.order.findUnique({
    where: { id },
  });

  if (!existingOrder) {
    return NextResponse.json(
      { error: "Order not found." },
      { status: 404 }
    );
  }

  // 3. ATOMIC LOCK: Conditionally transition to BOOKING_IN_PROGRESS
  // Allows UNBOOKED, FAILED, or a stale lock (> 2 minutes old)
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

  const lockResult = await prisma.order.updateMany({
    where: {
      id,
      OR: [
        { status: "UNBOOKED" },
        { status: "FAILED" },
        { status: "BOOKING_IN_PROGRESS", updatedAt: { lt: twoMinutesAgo } },
      ],
    },
    data: {
      status: "BOOKING_IN_PROGRESS",
    },
  });

  // If count is 0, the order is currently locked by another request or is already BOOKED
  if (lockResult.count === 0) {
    return NextResponse.json(
      { error: "This order is already being sent or is already booked." },
      { status: 409 }
    );
  }

  // 4. Dispatch to PostEx with a 15-second timeout guard
  let dispatchSucceeded = false;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error("PostEx dispatch request timed out after 15 seconds."));
      }, 15000);
    });

    const bookingPromise = bookWithPostEx({
      id: existingOrder.id,
      productName: existingOrder.productName,
      price: existingOrder.price,
      quantity: existingOrder.quantity,
      notes: existingOrder.notes,
      customerName: existingOrder.customerName,
      customerPhone: existingOrder.customerPhone,
      customerAddress: existingOrder.customerAddress,
      city: existingOrder.city,
    });

    const bookingResult = await Promise.race([bookingPromise, timeoutPromise]);

    // 5. On Success: Update to BOOKED
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: "BOOKED",
        trackingNumber: bookingResult.trackingNumber,
        courierReference: bookingResult.courierReference,
        bookedAt: new Date(),
        errorMessage: null,
      },
    });

    dispatchSucceeded = true;

    return NextResponse.json(
      {
        message: "Order dispatched to PostEx successfully.",
        order: updatedOrder,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const rawMessage = error instanceof Error ? error.message : "Courier dispatch error.";
    // Clean, readable message capped at ~200 characters without stack traces
    const cleanMessage = rawMessage.slice(0, 200);

    console.error(`[Dispatch Error for order ${id}]:`, cleanMessage);

    // Special Case: Missing token -> revert status back to UNBOOKED
    if (cleanMessage.includes("PostEx token is not set")) {
      const revertedOrder = await prisma.order.update({
        where: { id },
        data: {
          status: "UNBOOKED",
          errorMessage: null,
        },
      });

      return NextResponse.json(
        {
          error: "PostEx token is not set. Add POSTEX_API_TOKEN to .env.local.",
          order: revertedOrder,
        },
        { status: 400 }
      );
    }

    // Standard Failure -> mark as FAILED
    const failedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: "FAILED",
        errorMessage: cleanMessage,
      },
    });

    return NextResponse.json(
      {
        error: cleanMessage,
        order: failedOrder,
      },
      { status: 502 }
    );
  } finally {
    // Safety check: Ensure the order never remains stuck in BOOKING_IN_PROGRESS
    if (!dispatchSucceeded) {
      const current = await prisma.order.findUnique({
        where: { id },
        select: { status: true },
      });
      if (current?.status === "BOOKING_IN_PROGRESS") {
        await prisma.order.update({
          where: { id },
          data: {
            status: "FAILED",
            errorMessage: "Dispatch process terminated unexpectedly.",
          },
        });
      }
    }
  }
}
