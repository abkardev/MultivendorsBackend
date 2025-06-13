import expressAsyncHandler from "express-async-handler";
import { Support } from "../models/supportSchema.js";
import {AppError} from "../middlewares/errorHandler.js"


// @desc Create a new Support
// @router /api/support/
// @access Private

export const createSupport = expressAsyncHandler(async (req, res) => {
    try{
        const support = new Support(req.body);
        await support.save();
        res.status(201).json({ status: true, data: support });
    }catch (error){
        throw new AppError(error);
    }
});

// @desc Get All Support
// @router /api/support/
// @access Private

export const getAllSupports = expressAsyncHandler(async (req, res) => {
    try{
        const supports = await Support.find().populate(
            "user product assignedTo assignedBy");
       
        res.status(200).json({ status: true, data: supports });
    }catch (error){
        throw new AppError(error);
    }
});

// @desc Get A Support By Id
// @router /api/support/
// @access Private

export const getASupportById = expressAsyncHandler(async (req, res) => {
    try{
        const support = await Support.findById(req.params.id).populate(
            "user product assignedTo assignedBy");
        
            if(!support){
                return res
                .status(404).json({ status: false, message: "Support Query Not Found!"})
            }
        res.status(200).json({ status: true, data: support });
    }catch (error){
        throw new AppError(error);
    }
});



// @desc Update A Support By Id
// @router /api/support/
// @access Private

export const updateASupportById = expressAsyncHandler(async (req, res) => {
    try{
        const support = await Support.findByIdAndUpdate(req.params.id, req.body, {new: true});
            if(!support){
                return res
                .status(404).json({ status: false, message: "Support Query Not Found!"})
            }
        res.status(200).json({ status: true, data: support });
    }catch (error){
        throw new AppError(error);
    }
});


// @desc Delete A Support By Id
// @router /api/support/
// @access Private

export const deleteASupportById = expressAsyncHandler(async (req, res) => {
    try{
        const support = await Support.findByIdAndDelete(req.params.id);
            if(!support){
                return res
                .status(404)
                .json({ status: false, message: "Support Query Not Found!"})
            }
        res.status(200)
        .json({ status: true, message: "Support Deleted Successfully" });
    }catch (error){
        throw new AppError(error);
    }
});

// @desc Assign A Support By Id
// @router /api/support/
// @access Private

export const assignASupport = expressAsyncHandler(async (req, res) => {
    try{
        const {assignedTo, assignedBy} = req.body;
        const support = await Support.findByIdAndUpdate(req.params.id,
            {assignedTo, assignedBy},
             {new: true}).populate("user product assignedTo assignedBy");
            if(!support){
                return res
                .status(404)
                .json({ status: false, message: "Support Query Not Found!"})
            }
        res.status(200)
        .json({ status: true, data: support});
    }catch (error){
        throw new AppError(error);
    }
});


// @desc Update A Support Status
// @router /api/support/
// @access Private

export const updateASupportStatus = expressAsyncHandler(async (req, res) => {
    try{
        const { status} = req.body;
        const support = await Support.findByIdAndUpdate(req.params.id,
            {status},
             {new: true}).populate("user product assignedTo assignedBy");
            if(!support){
                return res
                .status(404)
                .json({ status: false, message: "Support Query Not Found!"})
            }
        res.status(200)
        .json({ status: true, data: support});
    }catch (error){
        throw new AppError(error);
    }
});