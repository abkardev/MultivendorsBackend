import express from "express";
import { createSubCategory, deleteASubCategory, getAllSubCategorys, getASubCategoryBySlug, updateASubCategory }
 from "../controllers/subCategoryController.js";


const subcategoryRouter = express.Router();

subcategoryRouter.post("/", createSubCategory);
subcategoryRouter.get("/:all", getAllSubCategorys);
subcategoryRouter.get("/:slug", getASubCategoryBySlug);
subcategoryRouter.put("/:id", updateASubCategory);
subcategoryRouter.delete("/:id", deleteASubCategory);


export default subcategoryRouter;