import { Router } from "express";
import * as resumeController from "../controllers/resumeController";

const router = Router();

router.post("/resume/search", resumeController.searchResumes);
router.get("/resumes", resumeController.listResumes);
router.get("/resumes/:id", resumeController.getResume);
router.delete("/resumes/:id", resumeController.deleteResume);

export default router;
