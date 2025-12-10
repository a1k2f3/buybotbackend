import express from "express";
import {
  createOrder,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
} from "../controller/orderController.js";
import { protect } from "../middleware/Usermiddleware.js";

const router = express.Router();

// user routes
// router.post("/", createOrder);
router.post("/", protect, createOrder);
router.get("/", protect, getUserOrders);
// router.get("/",getUserOrders);
router.delete("/cancel/:orderId", protect, cancelOrder);

// admin routes
router.get("/all", getAllOrders);
router.put("/update/:orderId", updateOrderStatus);

export default router;
