import type { NextFunction, Request, Response } from "express";

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const expectedApiKey = process.env.MAIL_API_KEY;
  const providedApiKey = req.header("x-api-key");

  if (!expectedApiKey) {
    res.status(500).json({ error: "Server configuration error: MAIL_API_KEY is missing" });
    return;
  }

  if (!providedApiKey || providedApiKey !== expectedApiKey) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
