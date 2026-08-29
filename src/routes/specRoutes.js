import express from "express";
import { getTemplate, getFilters, upsertTemplate, deleteTemplate } from "../controllers/specController.js";
import { protect, authorize } from "../middlewares/auth.js";

const router = express.Router();

router.get("/template/:taxonomyNodeId", getTemplate);
router.get("/filters/:taxonomyNodeId", getFilters);
router.put("/template/:taxonomyNodeId", protect, authorize("admin"), upsertTemplate);
router.delete("/template/:id", protect, authorize("admin"), deleteTemplate);

export default router;
