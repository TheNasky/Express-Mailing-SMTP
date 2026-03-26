const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function getEnvInt(name, fallback) {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

module.exports = {
  app: {
    port: getEnvInt("PORT", 8080)
  },
  mongo: {
    uri: process.env.MONGODB_URI || "mongodb://localhost:27017",
    database: process.env.MONGODB_DATABASE || "go_framework",
    collection: "emails_queue"
  },
  worker: {
    count: 2,
    processingDelayMs: 100,
    cleanupIntervalMs: 60 * 60 * 1000,
    cleanupAgeMs: 24 * 60 * 60 * 1000
  },
  providers: {
    smtp: {
      host: process.env.SMTP_HOST || "",
      port: getEnvInt("SMTP_PORT", 587),
      username: process.env.SMTP_USERNAME || "",
      password: process.env.SMTP_PASSWORD || "",
      from: process.env.SMTP_FROM || process.env.SMTP_USERNAME || "",
      maxEmailsPerHour: getEnvInt("SMTP_MAX_EMAILS_PER_HOUR", 1000),
      maxEmailsPerDay: getEnvInt("SMTP_MAX_EMAILS_PER_DAY", 10000)
    },
    resend: {
      apiKey: process.env.RESEND_API_KEY || "",
      from: process.env.RESEND_FROM || ""
    }
  }
};
