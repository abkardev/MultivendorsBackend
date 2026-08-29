import express from "express";
import { createNode, getAllNodes, getTree, getNode, updateNode, deleteNode, mergeNodes } from "../controllers/taxonomyController.js";
import { protect, authorize } from "../middlewares/auth.js";

const router = express.Router();

router.get("/tree", getTree);
router.get("/", getAllNodes);
router.get("/:id", getNode);
router.post("/", protect, authorize("admin"), createNode);
router.put("/:id", protect, authorize("admin"), updateNode);
router.delete("/:id", protect, authorize("admin"), deleteNode);
router.post("/merge", protect, authorize("admin"), mergeNodes);

export default router;
