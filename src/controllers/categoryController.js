import expressAsyncHandler from "express-async-handler";
import { Category } from "../models/categoryModel.js";
import { AppError } from "../middlewares/errorHandler.js"

// @desc Create a new Category
// @router /api/category/
// @access Private

export const createCategory = expressAsyncHandler(async (req, res) => {
    try{
        const newCategory = await Category.create(req.body);
        res.status(201).json({ status:true, data: newCategory});

    }catch (error){
        throw new AppError(error,400);
    }
})

// @desc Get All SubCategories
// @router /api/category/
// @access Public

export const getAllCategorys = expressAsyncHandler(async (req, res) => {
    try{
        const products = await Category.find();
        res.status(201).json({ status:true, data: products});

    }catch (error){
        throw new AppError(error,400);
    }
})

// @desc Get a Category By Slug
// @router /api/category/:slug
// @access Public

export const getACategoryBySlug = expressAsyncHandler(async (req, res) => {
    try{
        const category = await Category.findOne({slug: req.params.slug});
        res.status(201).json({ status:true, data: category});

    }catch (error){
        throw new AppError(error,400);
    }
})

// @desc Update a Category
// @router /api/category/:id
// @access Private

export const updateACategory = expressAsyncHandler(async (req, res) => {
    try{
        const category = await Category.findByIdAndUpdate(req.params.id, req.body,{
            new: true 
        });
        if(!category){
            throw new AppError("Category Not Found!", 400);
        }
        res.status(201).json({ status:true, data: category});

    }catch (error){
        throw new AppError(error,400);
    }
})

// @desc Delete a Category
// @router /api/category/:id
// @access Private

export const deleteACategory = expressAsyncHandler(async (req, res) => {
    try{
        const category = await Category.findByIdAndDelete(req.params.id);
        if(!category){
            throw new AppError("Category Not Found!", 400);
        }
        res.status(201).json({ status:true, message: "Category Deleted Successfully"});

    }catch (error){
        throw new AppError(error,400);
    }
})