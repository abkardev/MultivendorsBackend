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
import { protect, authorize } from "../middlewares/auth.js";
import { restrictVendorBuying } from "../middlewares/vendorVerification.js";
import { audit } from "../middlewares/auditMiddleware.js";


const orderRouter = express.Router();

orderRouter.get("/", protect, authorize("admin"), getAllOrders);
orderRouter.get("/:id", protect, getAnOrderById);
orderRouter.post("/", protect, authorize("user", "vendor"), restrictVendorBuying, audit('create', 'order', (req) => `Created order by ${req.user.name}`), createOrder);
orderRouter.put("/:id", protect, authorize("user", "vendor", "admin"), audit('update', 'order', (req) => `Updated order ${req.params.id} by ${req.user.name}`), updateAnOrder);
orderRouter.delete("/:id", protect, authorize("admin"), deleteAnOrder);
orderRouter.patch("/:id/status", protect, authorize("vendor", "admin"), audit('update', 'order', (req) => `Updated status of order ${req.params.id} by ${req.user.name}`), updateOrderStatus);
orderRouter.patch("/:id/cancel", protect, authorize("user", "vendor"), audit('update', 'order', (req) => `Cancelled order ${req.params.id} by ${req.user.name}`), handleOrderCancellation);
orderRouter.patch("/:id/return", protect, authorize("user"), audit('update', 'order', (req) => `Return requested for order ${req.params.id} by ${req.user.name}`), handleOrderReturn);
orderRouter.patch("/:id/return/status", protect, authorize("admin"), audit('update', 'order', (req) => `Updated return status of order ${req.params.id} by ${req.user.name}`), handleOrderReturnStatus);

export default orderRouter;
