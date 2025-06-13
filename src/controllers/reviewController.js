import expressAsyncHandler from "express-async-handler";
import { Review } from "../models/reviewModel.js";
import { AppError } from "../middlewares/errorHandler.js"

// @desc Create a new Review
// @router /api/review/
// @access Private

export const createReview = expressAsyncHandler(async (req, res) => {
    try{
        const newReview = await Review.create(req.body);
        res.status(201).json({ status:true, data: newReview});

    }catch (error){
        throw new AppError(error,400);
    }
})

// @desc Get All Reviews
// @router /api/review/
// @access Public

export const getAllReviews = expressAsyncHandler(async (req, res) => {
    try{
        const products = await Review.find();
        res.status(201).json({ status:true, data: products});

    }catch (error){
        throw new AppError(error,400);
    }
})

// @desc Get a Review By Id
// @router /api/review/:id
// @access Public

export const getAReviewById = expressAsyncHandler(async (req, res) => {
    try{
        const review = await Review.findOne({id: req.params.id});
        res.status(201).json({ status:true, data: review});

    }catch (error){
        throw new AppError(error,400);
    }
})

// @desc Update a Review
// @router /api/review/:id
// @access Private

export const updateAReview = expressAsyncHandler(async (req, res) => {
    try{
        const review = await Review.findByIdAndUpdate(req.params.id, req.body,{
            new: true 
        });
        if(!review){
            throw new AppError("Review Not Found!", 400);
        }
        res.status(201).json({ status:true, data: review});

    }catch (error){
        throw new AppError(error,400);
    }
})

// @desc Delete a Review
// @router /api/review/:id
// @access Private

export const deleteAReview = expressAsyncHandler(async (req, res) => {
    try{
        const review = await Review.findByIdAndDelete(req.params.id);
        if(!review){
            throw new AppError("Review Not Found!", 400);
        }
        res.status(201).json({ status:true, message: "Review Deleted Successfully"});

    }catch (error){
        throw new AppError(error,400);
    }
})

// @desc Approve a Review
// @router /api/review/approve-request
// @access Private

export const approveAReview = expressAsyncHandler(async (req, res) => {
    try{
        const review = await Review.findByIdAndUpdate(
            req.params.id, 
            { isApproved:req.body.isApproved },
            { new: true }
        );
        if(!review){
            throw new AppError("Review Not Found!", 400);
        }
        res.status(201).json({ status:true, message: "Review Approved Successfully"});

    }catch (error){
        throw new AppError(error,400);
    }
})