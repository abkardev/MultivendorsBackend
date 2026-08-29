import express from "express";
import { createProduct, deleteAProduct, getAllProducts, getAProductBySlug, getProductById, updateAProduct }
 from "../controllers/productController.js";
import { protect, authorize } from "../middlewares/auth.js";
import { loadSubscription, enforceProductLimit } from "../middlewares/planLimits.js";
import { requireVendorVerification } from "../middlewares/vendorVerification.js";
import { audit } from "../middlewares/auditMiddleware.js";


const productRouter = express.Router();

productRouter.get("/", getAllProducts);
productRouter.get("/id/:id", getProductById);
productRouter.get("/:slug", getAProductBySlug);
productRouter.post("/", protect, authorize("vendor", "admin"), requireVendorVerification, loadSubscription, enforceProductLimit, audit('create', 'product', (req) => `Created product by ${req.user.name}`), createProduct);
productRouter.put("/:id", protect, authorize("vendor", "admin"), requireVendorVerification, audit('update', 'product', (req) => `Updated product ${req.params.id} by ${req.user.name}`), updateAProduct);
productRouter.delete("/:id", protect, authorize("vendor", "admin"), audit('delete', 'product', (req) => `Deleted product ${req.params.id} by ${req.user.name}`), deleteAProduct);


export default productRouter;
