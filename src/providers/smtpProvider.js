const nodemailer = require("nodemailer");

class SMTPProvider {
  constructor(config) {
    this.config = config;
    this.name = "smtp";
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.username,
        pass: config.password
      }
    });
  }

  getName() {
    return this.name;
  }

  isConfigured() {
    return Boolean(this.config.host && this.config.username && this.config.password);
  }

  async send(job) {
    const info = await this.transporter.sendMail({
      from: this.config.from || this.config.username,
      to: job.to,
      subject: job.subject,
      html: job.html
    });

    return {
      provider: this.name,
      providerMsgID: info.messageId || `msg_${Date.now()}`
    };
  }

  validateEmail(email) {
    if (!email || typeof email !== "string" || !email.includes("@")) {
      throw new Error("invalid email format");
    }
  }
}

module.exports = SMTPProvider;
