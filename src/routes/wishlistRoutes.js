import express from "express";
import { createWishlist, deleteAWishlist, getAllWishlists, getAWishlistBySlug, updateAWishlist }
 from "../controllers/wishlistController.js";
import { protect } from "../middlewares/auth.js";


const wishlistRouter = express.Router();

wishlistRouter.get("/", getAllWishlists);
wishlistRouter.get("/:id", getAWishlistBySlug);
wishlistRouter.post("/", protect, createWishlist);
wishlistRouter.put("/:id", protect, updateAWishlist);
wishlistRouter.delete("/:id", protect, deleteAWishlist);


export default wishlistRouter;
