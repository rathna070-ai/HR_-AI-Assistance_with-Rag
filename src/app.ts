import express from "express";
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/logger";
import { requestId } from "./middleware/requestId";
import retrievalRoutes from "./modules/retrieval/routes/retrievalRoutes";
import ingestionRoutes from "./routes/ingestionRoutes";
import resumeRoutes from "./routes/resumeRoutes";

const app = express();

app.use(requestId);
app.use(requestLogger);
// Phase 17: JSON bodies above this size get 413. File uploads use multer's own limit.
app.use(express.json({ limit: process.env.REQUEST_BODY_LIMIT || "100kb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/v1", ingestionRoutes);
app.use("/v1", resumeRoutes);
app.use("/v1", retrievalRoutes);

app.use(errorHandler);

export default app;
