import { Resend } from "resend";
import type { QueuedMailMessage } from "../types/mail.js";

function getDefaultFromAddress() {
  return process.env.MAIL_DEFAULT_FROM ?? "onboarding@resend.dev";
}

export async function sendMail(payload: QueuedMailMessage) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is required");
  }

  const resend = new Resend(resendApiKey);
  const baseOptions = {
    from: payload.from ?? getDefaultFromAddress(),
    to: payload.to,
    subject: payload.subject,
    replyTo: payload.replyTo
  };

  if (payload.html) {
    return resend.emails.send({
      ...baseOptions,
      html: payload.html,
      text: payload.text
    });
  }

  if (payload.text) {
    return resend.emails.send({
      ...baseOptions,
      text: payload.text
    });
  }

  throw new Error("Either html or text content is required");
}
