import express from "express";
import { protect, authorize } from "../middlewares/auth.js";
import {
  listTranslations,
  getTranslation,
  upsertTranslation,
  deleteTranslation,
  getTranslationMap,
  bulkImport,
} from "../controllers/i18nController.js";

const router = express.Router();

// Public routes
router.get("/map/:lang", getTranslationMap);
router.get("/:key", getTranslation);

// Admin-only routes
router.get("/", protect, authorize("admin"), listTranslations);
router.put("/:key", protect, authorize("admin"), upsertTranslation);
router.delete("/:key", protect, authorize("admin"), deleteTranslation);
router.post("/bulk", protect, authorize("admin"), bulkImport);

export default router;
