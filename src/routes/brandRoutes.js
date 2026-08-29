import express from "express";
import { createBrand, deleteABrand, getAllBrands, getABrandBySlug, updateABrand }
 from "../controllers/brandController.js";
import { protect, authorize } from "../middlewares/auth.js";


const brandRouter = express.Router();

brandRouter.get("/", getAllBrands);
brandRouter.get("/:slug", getABrandBySlug);
brandRouter.post("/", protect, authorize("admin"), createBrand);
brandRouter.put("/:id", protect, authorize("admin"), updateABrand);
brandRouter.delete("/:id", protect, authorize("admin"), deleteABrand);


export default brandRouter;
