import { NextFunction, Request, Response } from "express";

// Phase 16: one structured JSON line per request. Only metadata is logged:
// no request bodies, resume text or API keys.
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    console.log(
      JSON.stringify({
        requestId: res.locals.requestId,
        endpoint: req.originalUrl.split("?")[0],
        method: req.method,
        durationMs: Number((process.hrtime.bigint() - start) / 1_000_000n),
        statusCode: res.statusCode,
        ...(res.locals.componentTimings && { componentTimings: res.locals.componentTimings }),
      }),
    );
  });
  next();
};
