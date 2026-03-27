import { z } from "zod";

const recipientSchema = z.union([z.string().email(), z.array(z.string().email()).min(1)]);
const plainEmailSchema = z.string().email();
const namedEmailRegex = /^[^<>]+<\s*([^<>\s]+@[^<>\s]+)\s*>$/;
const senderSchema = z.string().refine((value) => {
  if (plainEmailSchema.safeParse(value).success) {
    return true;
  }

  const matched = value.match(namedEmailRegex);
  if (!matched?.[1]) {
    return false;
  }

  return plainEmailSchema.safeParse(matched[1]).success;
}, "Must be a valid email or 'Name <email>' format");

export const mailSendSchema = z
  .object({
    to: recipientSchema,
    subject: z.string().min(1),
    html: z.string().min(1).optional(),
    text: z.string().min(1).optional(),
    from: senderSchema.optional(),
    replyTo: senderSchema.optional(),
    scheduledAt: z.string().datetime().optional()
  })
  .refine((value) => value.html || value.text, {
    message: "At least one of html or text is required",
    path: ["html"]
  });

export const queuedMailSchema = z
  .object({
    to: recipientSchema,
    subject: z.string().min(1),
    html: z.string().min(1).optional(),
    text: z.string().min(1).optional(),
    from: senderSchema.optional(),
    replyTo: senderSchema.optional()
  })
  .refine((value) => value.html || value.text, {
    message: "At least one of html or text is required",
    path: ["html"]
  });
