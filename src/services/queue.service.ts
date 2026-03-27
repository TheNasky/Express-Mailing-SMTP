import { Client, Receiver } from "@upstash/qstash";
import type { MailPayload, QueuedMailMessage } from "../types/mail.js";

function getQstashClient() {
  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    throw new Error("QSTASH_TOKEN is required");
  }
  return new Client({ token });
}

function getReceiver() {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (!currentSigningKey) {
    throw new Error("QSTASH_CURRENT_SIGNING_KEY is required");
  }

  return new Receiver({
    currentSigningKey,
    nextSigningKey: nextSigningKey ?? currentSigningKey
  });
}

function getProcessEndpoint() {
  const explicitEndpoint = process.env.MAIL_PROCESS_ENDPOINT;
  if (explicitEndpoint) {
    return explicitEndpoint;
  }

  const appBaseUrl = process.env.APP_BASE_URL;
  if (appBaseUrl) {
    return `${appBaseUrl.replace(/\/$/, "")}/api/mail/process`;
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/$/, "")}/api/mail/process`;
  }

  throw new Error("MAIL_PROCESS_ENDPOINT or APP_BASE_URL or VERCEL_URL is required");
}

export async function enqueueMail(payload: MailPayload) {
  const client = getQstashClient();
  const destination = getProcessEndpoint();

  const body: QueuedMailMessage = {
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    from: payload.from,
    replyTo: payload.replyTo
  };

  if (payload.scheduledAt) {
    const publishAtMs = Date.parse(payload.scheduledAt);
    const delaySeconds = Math.max(0, Math.floor((publishAtMs - Date.now()) / 1000));
    console.info("[mail.queue] publishing scheduled message", {
      destination,
      delaySeconds,
      toCount: Array.isArray(body.to) ? body.to.length : 1,
      subject: body.subject
    });

    return client.publishJSON({
      url: destination,
      body,
      delay: delaySeconds
    });
  }

  console.info("[mail.queue] publishing immediate message", {
    destination,
    toCount: Array.isArray(body.to) ? body.to.length : 1,
    subject: body.subject
  });

  return client.publishJSON({
    url: destination,
    body
  });
}

export async function verifyQstashSignature(signature: string | undefined, rawBody: string) {
  if (!signature) {
    return false;
  }

  const receiver = getReceiver();
  return receiver.verify({
    signature,
    body: rawBody
  });
}
