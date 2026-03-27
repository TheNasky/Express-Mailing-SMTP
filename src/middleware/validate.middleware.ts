import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";

export function validateBody<TSchema extends z.ZodTypeAny>(schema: TSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        error: "Invalid request payload",
        details: result.error.flatten()
      });
      return;
    }

    req.body = result.data;
    next();
  };
}
