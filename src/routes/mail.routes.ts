import express from "express";
import crypto from "node:crypto";
import { requireApiKey } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { mailSendSchema, queuedMailSchema } from "../schemas/mail.schema.js";
import { sendMail } from "../services/mailer.service.js";
import { enqueueMail, verifyQstashSignature } from "../services/queue.service.js";
import type { MailPayload, QueuedMailMessage } from "../types/mail.js";

const router = express.Router();

router.post("/send", express.json(), requireApiKey, validateBody(mailSendSchema), async (req, res) => {
  const requestId = crypto.randomUUID();
  try {
    const payload = req.body as MailPayload;
    console.info("[mail.send] enqueue requested", {
      requestId,
      toCount: Array.isArray(payload.to) ? payload.to.length : 1,
      subject: payload.subject,
      hasHtml: Boolean(payload.html),
      hasText: Boolean(payload.text),
      scheduledAt: payload.scheduledAt ?? null
    });

    const queued = await enqueueMail(payload);
    console.info("[mail.send] enqueue successful", {
      requestId,
      messageId: queued.messageId
    });

    res.status(202).json({
      ok: true,
      messageId: queued.messageId,
      status: "queued",
      requestId
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Failed to enqueue email";
    console.error("[mail.send] enqueue failed", { requestId, reason });
    res.status(500).json({ error: reason });
  }
});

router.post("/process", express.raw({ type: "application/json" }), async (req, res) => {
  const requestId = crypto.randomUUID();
  try {
    const signature = req.header("upstash-signature");
    const rawBody = req.body.toString("utf-8");
    console.info("[mail.process] webhook received", {
      requestId,
      hasSignature: Boolean(signature),
      bodyLength: rawBody.length
    });

    const isValid = await verifyQstashSignature(signature, rawBody);
    console.info("[mail.process] signature verification completed", { requestId, isValid });

    if (!isValid) {
      console.warn("[mail.process] invalid signature", { requestId });
      res.status(401).json({ error: "Invalid QStash signature" });
      return;
    }

    const parsedBody = JSON.parse(rawBody) as unknown;
    const parsedPayload = queuedMailSchema.safeParse(parsedBody);

    if (!parsedPayload.success) {
      console.warn("[mail.process] payload validation failed", {
        requestId,
        details: parsedPayload.error.flatten()
      });
      res.status(400).json({
        error: "Invalid process payload",
        details: parsedPayload.error.flatten()
      });
      return;
    }

    const payload = parsedPayload.data as QueuedMailMessage;
    console.info("[mail.process] payload validated", {
      requestId,
      toCount: Array.isArray(payload.to) ? payload.to.length : 1,
      subject: payload.subject,
      from: payload.from ?? null
    });

    const result = await sendMail(payload);
    console.info("[mail.process] resend response received", {
      requestId,
      hasError: Boolean(result.error),
      emailId: result.data?.id ?? null
    });

    if (result.error) {
      console.error("[mail.process] resend rejected request", {
        requestId,
        resendError: result.error
      });
      res.status(502).json({ error: result.error.message });
      return;
    }

    res.status(200).json({
      ok: true,
      status: "sent",
      emailId: result.data?.id ?? null,
      requestId
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Failed to process email";
    console.error("[mail.process] processing failed", { requestId, reason });
    res.status(500).json({ error: reason });
  }
});

export default router;
