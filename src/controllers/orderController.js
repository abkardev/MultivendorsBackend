import expressAsyncHandler from "express-async-handler";
import { Order } from "../models/orderModel.js";
import { AppError } from "../middlewares/errorHandler.js"
import { sanitizeBody } from "../utils/sanitize.js"
import { canAccess } from "../utils/ownership.js";

const ORDER_ALLOWED = ['user', 'items', 'shippingAddress', 'billingAddress', 'paymentMethod', 'notes', 'currency', 'coupon'];

// @desc Create a new Order
// @router /api/order/
// @access Private

export const createOrder = expressAsyncHandler(async (req, res) => {
    try{
        const data = sanitizeBody(req.body, ORDER_ALLOWED);
        data.user = req.user._id;
        const order = new Order(data);
        await order.save();
        res.status(201).json({ status: true, data: order });
    }catch (error){
        throw new AppError(error);
    }
});

// @desc Get All Orders
// @router /api/order/
// @access Private

export const getAllOrders = expressAsyncHandler(async (req, res) => {
    try{
        if (req.user.role !== 'admin') {
            return res.status(403).json({ status: false, message: "Forbidden" });
        }
        const orders = await Order.find().populate("user items.product");
        res.status(200).json({ status: true, data: orders });
    }catch (error){
        throw new AppError(error);
    }
});

// @desc Get A Single Order
// @router /api/order/
// @access Private

export const getAnOrderById = expressAsyncHandler(async (req, res) => {
    try{
        const order = await Order.findById(req.params.id).populate("user items.product");
        if (!order) {
            return res.status(404).json({ status: false, message: "Order Not Found" });
        }
        const ownerId = order.user?._id || order.user;
        if (!canAccess(req.user, ownerId)) {
            return res.status(404).json({ status: false, message: "Order Not Found" });
        }
        res.status(200).json({ status: true, data: order });
    }catch (error){
        throw new AppError(error);
    }
});


// @desc Update An Order
// @router /api/order/
// @access Private

export const updateAnOrder = expressAsyncHandler(async (req, res) => {
    try{
        const existing = await Order.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ status: false, message: "Order Not Found" });
        }
        const ownerId = existing.user?._id || existing.user;
        if (!canAccess(req.user, ownerId)) {
            return res.status(404).json({ status: false, message: "Order Not Found" });
        }
        const data = sanitizeBody(req.body, ORDER_ALLOWED);
        const order = await Order.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
        res.status(200).json({ status: true, data: order });
    }catch (error){
        throw new AppError(error);
    }
});


// @desc Delete An Order
// @router /api/order/
// @access Private

export const deleteAnOrder = expressAsyncHandler(async (req, res) => {
    try{
        if (req.user.role !== 'admin') {
            return res.status(403).json({ status: false, message: "Forbidden" });
        }
        const order = await Order.findByIdAndDelete(req.params.id);
        if(!order) {
            return res.status(404).json({ status: false, message: "Order Not Found" });
        }
        res.status(200).json({ status: true, message: "Order Deleted"});
    }catch (error){
        throw new AppError(error);
    }
});

// @desc Update An Order Status
// @router /api/order/
// @access Private

export const updateOrderStatus = expressAsyncHandler(async (req, res) => {
    try{
        const existing = await Order.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ status: false, message: "Order Not Found" });
        }
        const ownerId = existing.user?._id || existing.user;
        if (!canAccess(req.user, ownerId)) {
            return res.status(404).json({ status: false, message: "Order Not Found" });
        }
        const { status } = req.body;
        const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
        res.status(200).json({ status: true, data: order});
    }catch (error){
        throw new AppError(error);
    }
});


// @desc Handle Order Cancellation
// @router /api/order/
// @access Private

export const handleOrderCancellation = expressAsyncHandler(async (req, res) => {
    try{
        const existing = await Order.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ status: false, message: "Order Not Found" });
        }
        const ownerId = existing.user?._id || existing.user;
        if (!canAccess(req.user, ownerId)) {
            return res.status(404).json({ status: false, message: "Order Not Found" });
        }
        const { reason } = req.body;
        const order = await Order.findByIdAndUpdate(
            req.params.id,
             {status: "cancelled", cancellation: {reason, createAt: new Date() }},
             {new: true});
        res.status(200).json({ status: true, data: order});
    }catch (error){
        throw new AppError(error);
    }
});


// @desc Handle Order Return
// @router /api/order/
// @access Private

export const handleOrderReturn = expressAsyncHandler(async (req, res) => {
    try{
        const existing = await Order.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ status: false, message: "Order Not Found" });
        }
        const ownerId = existing.user?._id || existing.user;
        if (!canAccess(req.user, ownerId)) {
            return res.status(404).json({ status: false, message: "Order Not Found" });
        }
        const { reason } = req.body;
        const order = await Order.findByIdAndUpdate(
            req.params.id,
             {return: {reason, status: "pending", createAt: new Date() }},
             {new: true});
        res.status(200).json({ status: true, data: order});
    }catch (error){
        throw new AppError(error);
    }
});



// @desc Handle Order Return Status
// @router /api/order/
// @access Private

export const handleOrderReturnStatus = expressAsyncHandler(async (req, res) => {
    try{
        if (req.user.role !== 'admin') {
            return res.status(403).json({ status: false, message: "Forbidden" });
        }
        const { status } = req.body;
        const order = await Order.findOneAndUpdate(
            {_id :req.params.id, "return.status": "pending"},
             {"return.status" : status},
             {new: true});
        if(!order) {
            return res.status(404).json({ status: false, message: "Order Not Found or Return Already Processed"});
        }
        res.status(200).json({ status: true, data: order});
    }catch (error){
        throw new AppError(error);
    }
});
