import express from "express";
import {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from "../controller/cartController.js";
import { protect } from "../middleware/Usermiddleware.js";

const router = express.Router();

// router.post("/add", protect, addToCart);
router.post("/add", addToCart);
router.get("/", getCart);
router.put("/update", updateCartItem);
router.delete("/remove/:productId",removeCartItem);
// router.delete("/remove/:productId", protect, removeCartItem);
router.delete("/clear",clearCart);

export default router;
