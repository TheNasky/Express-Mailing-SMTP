Analysis: Express Mailing App on Vercel
Let me lay out a thorough analysis before we write a single line of code.

🏗️ Architecture Overview
The core challenge is that Vercel is a serverless/edge platform, which fundamentally shapes how we must architect this. No persistent processes, no traditional servers, and no in-memory queues.

⚠️ Vercel Constraints to Design Around
Constraint	Details
Execution timeout	10s (Hobby), 60s (Pro) per function invocation
No persistent processes	Functions spin up and down; no in-memory state
No WebSockets	On Serverless Functions (Edge supports limited streaming)
Cold starts	First request after idle can have latency
No background threads	You can't fire-and-forget a thread that outlives the response
Stateless	Each invocation is isolated — no shared memory
This means a naive "async queue in-memory" approach will not work. We need an external queuing mechanism.

🧩 Proposed Stack
Layer	Technology	Reason
Runtime	Node.js on Vercel Serverless Functions	Express adapts cleanly via @vercel/node
Framework	Express.js	Lightweight, composable, familiar
Email	Resend API	Modern, developer-first, free tier (3k emails/mo), no SMTP headaches, fast REST calls
Async Queue	Upstash QStash	Serverless-native HTTP message queue — perfect for Vercel. Free tier included.
Validation	Zod	Schema validation for incoming payloads
Auth	API Key (header-based)	Simple, stateless, no sessions needed
🔄 Async/Event-Driven Flow
Since we can't use in-process queues, here's how the event-based pattern works in serverless:

Client
  │
  ▼
POST /api/mail/send
  │  (validates payload, returns 202 Accepted immediately)
  │
  ▼
QStash Queue (Upstash)
  │  (durable HTTP message queue — retries, delay, scheduling)
  │
  ▼
POST /api/mail/process  ← QStash calls this webhook internally
  │  (actually sends the email via Resend)
  │
  ▼
Resend API → Recipient's inbox
This gives us:

✅ Non-blocking responses — caller gets 202 instantly
✅ Automatic retries on failure (QStash handles this)
✅ Works within Vercel's serverless constraints
✅ Durable — messages survive cold starts
✅ Schedulable — can delay or schedule future emails
📁 Project Structure
/
├── api/
│   ├── index.ts              # Express app entry (Vercel serverless adapter)
│   └── mail/
│       ├── send.ts           # POST /api/mail/send — enqueue email
│       └── process.ts        # POST /api/mail/process — QStash webhook, sends email
├── src/
│   ├── app.ts                # Express app setup, middleware, routes
│   ├── routes/
│   │   └── mail.routes.ts
│   ├── services/
│   │   ├── mailer.service.ts # Resend SDK wrapper
│   │   └── queue.service.ts  # QStash wrapper
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   └── validate.middleware.ts
│   └── schemas/
│       └── mail.schema.ts    # Zod schemas
├── vercel.json               # Serverless function config + routing
├── .env.example
├── package.json
└── tsconfig.json
🔑 API Design
Endpoint	Method	Auth	Purpose
/api/mail/send	POST	API Key	Enqueue a new email
/api/mail/process	POST	QStash Signature	Internal webhook — sends the actual email
/api/health	GET	None	Health check
POST /api/mail/send payload:

json
{
  "to": "user@example.com",        // or array
  "subject": "Hello!",
  "html": "<p>Body</p>",           // or...
  "text": "Body",                   // plain text fallback
  "from": "noreply@yourdomain.com", // optional override
  "replyTo": "support@you.com",    // optional
  "scheduledAt": "2026-04-01T10:00:00Z" // optional — delayed delivery
}
🆓 Free Tier Summary
Service	Free Tier
Vercel	Unlimited serverless invocations (Hobby)
Resend	3,000 emails/month, 100/day
Upstash QStash	500 messages/day, retries included
This is truly zero cost for moderate mailing needs.

🔒 Security Considerations
API key auth on /send to prevent abuse
QStash signature verification on /process so only QStash can trigger it
Rate limiting can be added via Vercel Edge Middleware if needed
Zod validation on all inputs
📋 Implementation Phases
Foundation — Project scaffold, Express setup, Vercel config, TypeScript
Core Mail Service — Resend integration, Zod schemas, validation
Queue Integration — QStash setup, enqueue on /send, webhook on /process
Auth & Security — API key middleware, QStash signature verification
Polish — Health endpoint, error handling, .env.example, documentation
Does this plan align with what you had in mind? A few questions before we start:

Domain: Do you have a custom domain for the from address, or should we use Resend's shared domain (onboarding@resend.dev) for now?
QStash vs simpler async: QStash is ideal for durability/retries. If you're fine skipping retries, we could use a simpler fire-and-forget pattern. Want the full durable queue?
TypeScript: I'm planning to use TypeScript — confirm?
Existing account: Do you already have Resend or Upstash accounts, or should I include setup instructions?