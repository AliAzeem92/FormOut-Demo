import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary server-side using environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
  urlAnalytics: false,
});

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  format: string;
}

/**
 * Uploads an image buffer to Cloudinary and forces conversion/delivery to WebP format.
 * Secrets remain strictly on the server.
 */
export async function uploadImageToCloudinary(
  buffer: Buffer,
  folder: string = "shiplink"
): Promise<CloudinaryUploadResult> {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error("Missing Cloudinary configuration on server.");
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        format: "webp",
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error("Cloudinary upload failed with empty result."));
        }

        // Generate delivery URL explicitly guaranteeing .webp extension
        const webpUrl = cloudinary.url(result.public_id, {
          secure: true,
          format: "webp",
        });

        resolve({
          url: webpUrl,
          publicId: result.public_id,
          format: result.format || "webp",
        });
      }
    );

    uploadStream.end(buffer);
  });
}

export default cloudinary;
