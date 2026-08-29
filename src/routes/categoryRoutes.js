import express from "express";
import { createCategory, deleteACategory, getAllCategorys, getACategoryBySlug, updateACategory }
 from "../controllers/categoryController.js";
import { protect, authorize } from "../middlewares/auth.js";


const categoryRouter = express.Router();

categoryRouter.get("/", getAllCategorys);
categoryRouter.get("/:slug", getACategoryBySlug);
categoryRouter.post("/", protect, authorize("admin"), createCategory);
categoryRouter.put("/:id", protect, authorize("admin"), updateACategory);
categoryRouter.delete("/:id", protect, authorize("admin"), deleteACategory);


export default categoryRouter;
