import express from "express";
import { protect } from "../middlewares/auth.js";
import { translate, translateBatchEndpoint, getLanguages } from "../controllers/translationController.js";

const router = express.Router();

router.get("/languages", getLanguages);
router.post("/", protect, translate);
router.post("/batch", protect, translateBatchEndpoint);

export default router;
