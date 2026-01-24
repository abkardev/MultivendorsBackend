import { getVendorMe } from '../controllers/vendorMeController.js';
import express from "express";
import { protect } from "../middlewares/authMiddleware.js"
import { createVendor, deleteVendor, getVendorBySlug, getVendors, updateVendor } from "../controllers/vendorController.js";

const vendorRouter = express.Router();
n// Get current vendor for authenticated user
vendorRouter.get('/me', protect, getVendorMe);


// Create a vendor route

vendorRouter.post("/", createVendor);

// Get vendors route

vendorRouter.get("/all", getVendors);

// Get vendor By Slug route

vendorRouter.get("/:slug", getVendorBySlug);

// Update a vendor route

vendorRouter.put("/:id", updateVendor);

// Delete a vendor route

vendorRouter.delete("/:id", deleteVendor);




export default vendorRouter;