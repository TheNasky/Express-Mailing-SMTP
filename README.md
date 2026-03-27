# Mailing Express

Serverless Express mailing API for Vercel using Resend and Upstash QStash.

## Endpoints

- `GET /api/health`: health check
- `POST /api/mail/send`: validates and enqueues email (requires `x-api-key`)
- `POST /api/mail/process`: internal webhook called by QStash to send email via Resend

## Payload (`POST /api/mail/send`)

```json
{
  "to": "user@example.com",
  "subject": "Hello",
  "html": "<p>Hello</p>",
  "text": "Hello",
  "from": "onboarding@resend.dev",
  "replyTo": "support@example.com",
  "scheduledAt": "2026-04-01T10:00:00Z"
}
```

Notes:
- `to` can be a single email or an array of emails.
- You must provide at least one of `html` or `text`.
- `scheduledAt` is optional and uses ISO datetime.

## Local Setup

1. Install dependencies:
   - `npm install`
2. Copy env template:
   - `copy .env.example .env`
3. Fill environment variables in `.env`.
4. Run locally:
   - `npm run dev`

## Required Environment Variables

- `MAIL_API_KEY`: API key checked from `x-api-key` on `/api/mail/send`
- `RESEND_API_KEY`: Resend API key
- `QSTASH_TOKEN`: QStash publish token
- `QSTASH_CURRENT_SIGNING_KEY`: QStash webhook signature key

## Optional Environment Variables

- `MAIL_DEFAULT_FROM`: defaults to `onboarding@resend.dev`
- `QSTASH_NEXT_SIGNING_KEY`: supports key rotation
- `APP_BASE_URL`: used to build process endpoint URL
- `MAIL_PROCESS_ENDPOINT`: explicit process endpoint URL override

## Deployment (Vercel)

1. Push repo to GitHub.
2. Import project in Vercel.
3. Add env vars in Vercel Project Settings.
4. Deploy.

After deploy, test:
- `GET https://<your-domain>/api/health`
- `POST https://<your-domain>/api/mail/send`
