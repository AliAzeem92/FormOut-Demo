import { NextResponse } from "next/server";
import { uploadImageToCloudinary } from "@/lib/cloudinary";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No image file provided in form data ('file' field required)." },
        { status: 400 }
      );
    }

    // Server-side MIME type check
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Invalid file type '${file.type}'. Only JPEG, PNG, and WebP images are allowed.`,
        },
        { status: 400 }
      );
    }

    // Server-side file size check
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 5 MB maximum limit.`,
        },
        { status: 400 }
      );
    }

    // Convert file to Node.js Buffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary with WebP conversion
    const uploadResult = await uploadImageToCloudinary(buffer, "shiplink/products");

    return NextResponse.json(
      {
        url: uploadResult.url,
        format: uploadResult.format,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Image upload failed";
    console.error("[Upload Route Error]:", message);

    return NextResponse.json(
      { error: "Failed to upload image. Please try again." },
      { status: 500 }
    );
  }
}
