import express from "express";
import mailRouter from "./routes/mail.routes.js";

const app = express();

app.get("/api/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "mailing-express" });
});

app.use("/api/mail", mailRouter);

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Internal server error";
  res.status(500).json({ error: message });
});

export default app;
