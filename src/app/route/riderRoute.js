import express from "express";
import {
  registerRider,
  loginRider,
  getNewOrders,
  acceptOrder,
  getOrderLocation,
  updateDeliveryStatus,
  getMyOrders,
} from "../controller/riderController.js";
import { protectRider } from "../middleware/riderAuth.js";
const router = express.Router();
router.post("/register", registerRider);
router.post("/login", loginRider);
router.get("/orders/new", protectRider, getNewOrders);
router.post("/orders/accept/:orderId", protectRider, acceptOrder);
router.get("/orders/my", protectRider, getMyOrders);
router.get("/orders/location/:orderId", protectRider, getOrderLocation);
router.put("/orders/status/:orderId", protectRider, updateDeliveryStatus);
export default router;