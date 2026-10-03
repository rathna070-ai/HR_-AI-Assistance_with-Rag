import crypto from "crypto";
import { NextFunction, Request, Response } from "express";

// A caller-supplied X-Request-Id is kept when it looks safe to log.
const SAFE_REQUEST_ID = /^[\w.-]{1,100}$/;

// Phase 16: every request gets an id, returned in the X-Request-Id header and
// available to handlers as res.locals.requestId.
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const incoming = req.get("x-request-id");
  const id = incoming && SAFE_REQUEST_ID.test(incoming) ? incoming : crypto.randomUUID();
  res.locals.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
};
