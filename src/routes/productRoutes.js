import express from "express";
import { createProduct, deleteAProduct, getAllProducts, getAProductBySlug, updateAProduct }
 from "../controllers/productController.js";


const productRouter = express.Router();

productRouter.post("/", createProduct);
productRouter.get("/:all", getAllProducts);
productRouter.get("/:slug", getAProductBySlug);
productRouter.put("/:id", updateAProduct);
productRouter.delete("/:id", deleteAProduct);


export default productRouter;