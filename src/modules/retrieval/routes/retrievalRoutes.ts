import { Router } from "express";
import * as retrievalController from "../controllers/retrievalController";

const router = Router();

router.get("/search/readiness", retrievalController.getReadiness);
router.post("/embeddings", retrievalController.createEmbedding);
router.post("/search/bm25", retrievalController.bm25Search);
router.post("/search/vector", retrievalController.vectorSearch);
router.post("/search/hybrid", retrievalController.hybridSearch);
router.post("/search/rerank", retrievalController.rerank);
router.post("/search/summarize", retrievalController.summarize);
router.post("/search/summaries", retrievalController.summarizeShortlist);
router.post("/search", retrievalController.search);

export default router;
