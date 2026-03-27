import { z } from "zod";

const recipientSchema = z.union([z.string().email(), z.array(z.string().email()).min(1)]);

export const mailSendSchema = z
  .object({
    to: recipientSchema,
    subject: z.string().min(1),
    html: z.string().min(1).optional(),
    text: z.string().min(1).optional(),
    from: z.string().email().optional(),
    replyTo: z.string().email().optional(),
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
    from: z.string().email().optional(),
    replyTo: z.string().email().optional()
  })
  .refine((value) => value.html || value.text, {
    message: "At least one of html or text is required",
    path: ["html"]
  });
