import { z } from "zod";
import { CITY_VALUES } from "./cities";

// Phone validation: strip spaces and dashes, must be exactly 11 digits starting with 03
export const pakistaniPhoneSchema = z
  .string({ message: "Phone number is required" })
  .transform((val) => val.replace(/[\s-]/g, ""))
  .pipe(
    z
      .string()
      .regex(/^03\d{9}$/, { message: "Phone must be 11 digits in Pakistani format (03XXXXXXXXX)" })
  );

// City validation: must be one of the approved cities in lib/cities.ts
export const cityValidationSchema = z
  .string({ message: "City is required" })
  .refine((val) => (CITY_VALUES as readonly string[]).includes(val), {
    message: "City must be selected from the operational cities list",
  });

// Schema for creating an order
export const createOrderSchema = z.object({
  productName: z
    .string({ message: "Product name is required" })
    .trim()
    .min(1, { message: "Product name cannot be empty" }),
  price: z.coerce
    .number({ message: "Price must be a number" })
    .positive({ message: "Price must be a positive number (PKR)" }),
  quantity: z.coerce
    .number({ message: "Quantity must be an integer" })
    .int({ message: "Quantity must be a whole number" })
    .positive({ message: "Quantity must be at least 1" })
    .default(1),
  notes: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  imageUrl: z
    .string({ message: "Image URL is required" })
    .url({ message: "A valid image URL is required" }),
  customerName: z
    .string({ message: "Customer name is required" })
    .trim()
    .min(1, { message: "Customer name cannot be empty" }),
  customerPhone: pakistaniPhoneSchema,
  customerAddress: z
    .string({ message: "Delivery address is required" })
    .trim()
    .min(5, { message: "Delivery address must be at least 5 characters long" }),
  city: cityValidationSchema,
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
