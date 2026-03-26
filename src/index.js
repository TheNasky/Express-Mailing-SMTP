const express = require("express");
const config = require("./config");
const logger = require("./logger");
const { connectMongo, closeMongo } = require("./db");
const EmailService = require("./emailService");
const createRoutes = require("./routes");

async function start() {
  await connectMongo();
  const emailService = new EmailService();
  await emailService.init();

  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(createRoutes(emailService));

  app.use((_req, res) => {
    res.status(404).json({ status: "error", message: "Route not found" });
  });

  const server = app.listen(config.app.port, "0.0.0.0", () => {
    logger.info({ port: config.app.port }, "Express email API running");
  });

  async function shutdown() {
    logger.info("Shutting down server");
    server.close(async () => {
      await closeMongo();
      process.exit(0);
    });
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((error) => {
  logger.error({ err: error }, "Failed to start API");
  process.exit(1);
});
