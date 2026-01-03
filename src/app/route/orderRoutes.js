import express from "express";
import {
  createOrder,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
  getOrdersByStoreId,
  getOrderDetailById,
} from "../controller/orderController.js";
import { protect } from "../middleware/Usermiddleware.js";

const router = express.Router();

// user routes
// router.post("/", createOrder);
router.post("/",createOrder);
// router.get("/", protect, getUserOrders);
router.get("/", getUserOrders);
// router.get("/",getUserOrders);
router.delete("/cancel/:orderId",cancelOrder);
// router.get("/all-orders", protect, getAllOrders);
router.get("/store-orders",getOrdersByStoreId);
// router.get("/store-orders", protect, getOrdersByStoreId);
// admin routes
router.get("/all", getAllOrders);
router.put("/update/:orderId",updateOrderStatus);
// router.get("/store/order/:orderId", protect, getOrderDetailById);
router.get("/store/order/:orderId", getOrderDetailById);
export default router;
