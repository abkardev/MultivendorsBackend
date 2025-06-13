import expressAsyncHandler from "express-async-handler";
import { Wishlist } from "../models/wishlistModel.js";
import { AppError } from "../middlewares/errorHandler.js"

// @desc Create a new Wishlist
// @router /api/wishlist/
// @access Private

export const createWishlist = expressAsyncHandler(async (req, res) => {
    try{
        const newWishlist = await Wishlist.create(req.body);
        res.status(201).json({ status:true, data: newWishlist});

    }catch (error){
        throw new AppError(error,400);
    }
})

// @desc Get All SubCategories
// @router /api/wishlist/
// @access Public

export const getAllWishlists = expressAsyncHandler(async (req, res) => {
    try{
        const products = await Wishlist.find();
        res.status(201).json({ status:true, data: products});

    }catch (error){
        throw new AppError(error,400);
    }
})

// @desc Get a Wishlist By Slug
// @router /api/wishlist/:slug
// @access Public

export const getAWishlistBySlug = expressAsyncHandler(async (req, res) => {
    try{
        const wishlist = await Wishlist.findById(req.params.id);
        res.status(201).json({ status:true, data: wishlist});

    }catch (error){
        throw new AppError(error,400);
    }
})

// @desc Update a Wishlist
// @router /api/wishlist/:id
// @access Private

export const updateAWishlist = expressAsyncHandler(async (req, res) => {
    try{
        const wishlist = await Wishlist.findByIdAndUpdate(req.params.id, req.body,{
            new: true 
        });
        if(!wishlist){
            throw new AppError("Wishlist Not Found!", 400);
        }
        res.status(201).json({ status:true, data: wishlist});

    }catch (error){
        throw new AppError(error,400);
    }
})

// @desc Delete a Wishlist
// @router /api/wishlist/:id
// @access Private

export const deleteAWishlist = expressAsyncHandler(async (req, res) => {
    try{
        const wishlist = await Wishlist.findByIdAndDelete(req.params.id);
        if(!wishlist){
            throw new AppError("Wishlist Not Found!", 400);
        }
        res.status(201).json({ status:true, message: "Wishlist Deleted Successfully"});

    }catch (error){
        throw new AppError(error,400);
    }
})