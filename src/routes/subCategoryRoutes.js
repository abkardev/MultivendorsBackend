import express from "express";
import { createSubCategory, deleteASubCategory, getAllSubCategorys, getASubCategoryBySlug, updateASubCategory }
 from "../controllers/subCategoryController.js";
import { protect, authorize } from "../middlewares/auth.js";


const subcategoryRouter = express.Router();

subcategoryRouter.get("/", getAllSubCategorys);
subcategoryRouter.get("/:slug", getASubCategoryBySlug);
subcategoryRouter.post("/", protect, authorize("admin"), createSubCategory);
subcategoryRouter.put("/:id", protect, authorize("admin"), updateASubCategory);
subcategoryRouter.delete("/:id", protect, authorize("admin"), deleteASubCategory);


export default subcategoryRouter;
