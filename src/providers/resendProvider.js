const { Resend } = require("resend");

class ResendProvider {
  constructor(config) {
    this.config = config;
    this.name = "resend";
    this.client = new Resend(config.apiKey);
  }

  getName() {
    return this.name;
  }

  isConfigured() {
    return Boolean(this.config.apiKey && this.config.from);
  }

  async send(job) {
    const result = await this.client.emails.send({
      from: this.config.from,
      to: [job.to],
      subject: job.subject,
      html: job.html
    });

    if (result.error) {
      throw new Error(result.error.message || "resend send failed");
    }

    return {
      provider: this.name,
      providerMsgID: result.data?.id || `msg_${Date.now()}`
    };
  }

  validateEmail(email) {
    if (!email || typeof email !== "string" || !email.includes("@")) {
      throw new Error("invalid email format");
    }
  }
}

module.exports = ResendProvider;
