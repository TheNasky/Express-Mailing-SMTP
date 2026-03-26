# Express API Clone

This is a separate Express implementation that mirrors the Go email API behavior and endpoints.

## Endpoints

- `POST /api/v1/emails/send`
- `GET /api/v1/emails/:id/status`
- `GET /api/v1/emails/stats`
- `GET /api/v1/emails/health`

Response shape follows:

```json
{
  "status": "success",
  "message": "Email queued successfully",
  "payload": {}
}
```

## Setup

1. Copy `.env.example` to `.env`
2. Install dependencies:
   - `npm install`
3. Run:
   - `npm run dev`
   - or `npm start`

## Notes

- The API enqueues jobs to MongoDB and sends asynchronously via worker loops.
- Provider order is: Resend first, SMTP second.
- If SMTP is blocked in your hosting environment, configure `RESEND_API_KEY` and `RESEND_FROM`.
