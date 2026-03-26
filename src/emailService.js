const { MongoQueue, STATUS_PENDING } = require("./queue/mongoQueue");
const createProviders = require("./providers");
const EmailWorker = require("./worker");
const config = require("./config");

class EmailService {
  constructor() {
    this.queue = new MongoQueue();
    this.providers = createProviders();
    this.worker = new EmailWorker(this.queue, this.providers, config.worker);
  }

  async init() {
    await this.queue.createIndexes();
    this.worker.start();
  }

  validateSendRequest(input) {
    if (!input.to) throw new Error("recipient email is required");
    if (!input.subject) throw new Error("subject is required");
    if (!input.html) throw new Error("HTML content is required");
    if (!input.from) throw new Error("sender email is required");

    const priority = input.priority || 2;
    if (priority < 1 || priority > 3) {
      throw new Error("priority must be between 1 and 3");
    }

    if (this.providers.length > 0) {
      for (const provider of this.providers) {
        provider.validateEmail(input.to);
        provider.validateEmail(input.from);
      }
    }

    return priority;
  }

  async sendEmail(input) {
    const priority = this.validateSendRequest(input);
    const now = new Date();

    const id = await this.queue.enqueue({
      to: input.to,
      subject: input.subject,
      html: input.html,
      from: input.from,
      status: STATUS_PENDING,
      priority,
      attempts: 0,
      max_attempts: 3,
      created_at: now,
      scheduled_at: now
    });

    return {
      id: String(id),
      status: "queued",
      message: "Email queued successfully",
      queued_at: now,
      estimated_delivery: new Date(Date.now() + 5 * 60 * 1000)
    };
  }

  async getStatus(id) {
    const job = await this.queue.getJobById(id);
    if (!job) {
      return null;
    }

    return {
      id: String(job._id),
      status: job.status,
      to: job.to,
      subject: job.subject,
      created_at: job.created_at,
      processed_at: job.processed_at || null,
      error_message: job.error_message || null,
      provider: job.provider || "",
      provider_msg_id: job.provider_msg_id || ""
    };
  }

  async getStats() {
    return this.queue.getQueueStats();
  }
}

module.exports = EmailService;
