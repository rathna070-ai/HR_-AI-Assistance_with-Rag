import { NextFunction, Request, Response } from "express";

interface BodyParserError extends Error {
  type?: string;
  status?: number;
}

// Phase 17: JSON error responses for oversized or malformed bodies, and for
// anything a route did not handle. Must be registered after all routes.
export const errorHandler = (err: BodyParserError, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) return next(err);

  if (err.type === "entity.too.large") {
    return res.status(413).json({ success: false, errorCode: "PAYLOAD_TOO_LARGE", message: "Request body is too large" });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, errorCode: "INVALID_JSON", message: "Request body is not valid JSON" });
  }

  console.error(JSON.stringify({ requestId: res.locals.requestId, error: err.message }));
  return res.status(500).json({ success: false, errorCode: "INTERNAL_ERROR", message: "Unexpected server error" });
};
