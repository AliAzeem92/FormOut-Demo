import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createOrderSchema } from "@/lib/validations";

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ orders }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error fetching orders";
    console.error("[Orders GET Error]:", message);

    return NextResponse.json(
      { error: "Failed to fetch orders." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body." },
        { status: 400 }
      );
    }

    const validationResult = createOrderSchema.safeParse(body);

    if (!validationResult.success) {
      const fieldErrors = validationResult.error.flatten().fieldErrors;
      return NextResponse.json(
        {
          error: "Validation failed",
          details: fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    const order = await prisma.order.create({
      data: {
        productName: data.productName,
        price: data.price,
        quantity: data.quantity,
        notes: data.notes ?? null,
        imageUrl: data.imageUrl,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerAddress: data.customerAddress,
        city: data.city,
        status: "UNBOOKED",
      },
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error creating order";
    console.error("[Orders POST Error]:", message);

    return NextResponse.json(
      { error: "Failed to create order in database." },
      { status: 500 }
    );
  }
}
