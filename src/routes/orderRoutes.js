import express from "express";
import { 
    createOrder, 
    deleteAnOrder, 
    getAllOrders, 
    getAnOrderById, 
    handleOrderCancellation, 
    handleOrderReturn, 
    handleOrderReturnStatus, 
    updateAnOrder, 
    updateOrderStatus 
} from "../controllers/orderController.js";


const orderRouter = express.Router();

orderRouter.post("/", createOrder);
orderRouter.get("/", getAllOrders);
orderRouter.get("/:id", getAnOrderById);
orderRouter.put("/:id", updateAnOrder);
orderRouter.delete("/:id", deleteAnOrder);
orderRouter.patch("/:id/status", updateOrderStatus);
orderRouter.patch("/:id/cancel", handleOrderCancellation);
orderRouter.patch("/:id/return", handleOrderReturn);
orderRouter.patch("/:id/return/status", handleOrderReturnStatus);

export default orderRouter;
