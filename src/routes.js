const express = require("express");

function ok(message, payload) {
  return { status: "success", message, payload };
}

function fail(message, payload) {
  return { status: "error", message, payload };
}

function createRoutes(emailService) {
  const router = express.Router();

  router.post("/api/v1/emails/send", async (req, res) => {
    try {
      const response = await emailService.sendEmail(req.body || {});
      return res.status(201).json(ok("Email queued successfully", response));
    } catch (error) {
      return res.status(400).json(fail("Failed to send email", { error: error.message }));
    }
  });

  router.get("/api/v1/emails/:id/status", async (req, res) => {
    try {
      const status = await emailService.getStatus(req.params.id);
      if (!status) {
        return res.status(404).json(fail("Email not found", { error: "email not found" }));
      }
      return res.status(200).json(ok("Email status retrieved successfully", status));
    } catch (error) {
      return res.status(400).json(fail("Email not found", { error: error.message }));
    }
  });

  router.get("/api/v1/emails/stats", async (_req, res) => {
    try {
      const stats = await emailService.getStats();
      return res.status(200).json(ok("Statistics retrieved successfully", stats));
    } catch (error) {
      return res.status(500).json(fail("Failed to get statistics", { error: error.message }));
    }
  });

  router.get("/api/v1/emails/health", (_req, res) => {
    return res.status(200).json(
      ok("Email service is healthy", {
        status: "healthy",
        service: "email",
        timestamp: new Date().toISOString(),
        version: "1.0.0"
      })
    );
  });

  router.get("/swagger", (_req, res) => {
    return res.status(200).send("Use Postman with /api/v1/emails/* endpoints.");
  });

  return router;
}

module.exports = createRoutes;
