const logger = require("./logger");

class EmailWorker {
  constructor(queue, providers, options) {
    this.queue = queue;
    this.providers = providers;
    this.options = options;
    this.timers = [];
    this.cleanupTimer = null;
    this.running = false;
  }

  start() {
    if (this.running) {
      return;
    }

    this.running = true;
    logger.info({ workers: this.options.count }, "Starting email worker");

    for (let i = 0; i < this.options.count; i += 1) {
      this.runLoop(i);
    }

    this.cleanupTimer = setInterval(async () => {
      try {
        await this.queue.cleanupOldJobs(this.options.cleanupAgeMs);
      } catch (error) {
        logger.error({ err: error }, "Cleanup routine failed");
      }
    }, this.options.cleanupIntervalMs);
  }

  async runLoop(workerId) {
    while (this.running) {
      try {
        await this.processNext(workerId);
      } catch (error) {
        logger.error({ err: error, workerId }, "Worker loop error");
      }

      await new Promise((resolve) => {
        const timer = setTimeout(resolve, this.options.processingDelayMs);
        this.timers.push(timer);
      });
    }
  }

  async processNext(workerId) {
    const result = await this.queue.dequeue();
    const job = result && result.value ? result.value : result;
    if (!job) {
      return;
    }

    logger.info({ workerId, jobId: String(job._id), to: job.to }, "Processing email job");

    let lastError = null;
    for (const provider of this.providers) {
      try {
        provider.validateEmail(job.to);
        const sendResult = await provider.send(job);
        await this.queue.markComplete(job._id, sendResult.provider, sendResult.providerMsgID);
        logger.info({ workerId, jobId: String(job._id), provider: provider.getName() }, "Email sent");
        return;
      } catch (error) {
        lastError = error;
      }
    }

    const errorMessage = lastError ? lastError.message : "all providers failed";
    await this.queue.markFailed(job._id, errorMessage);
    logger.error({ workerId, jobId: String(job._id), err: lastError }, "Failed to send email");
  }

  async stop() {
    this.running = false;
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    for (const timer of this.timers) {
      clearTimeout(timer);
    }
    this.timers = [];
  }
}

module.exports = EmailWorker;
