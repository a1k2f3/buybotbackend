import express from "express";
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  updateProductStatus
} from "../controller/productController.js";

const router = express.Router();
// product route
router.post("/", createProduct);
router.get("/", getAllProducts);
router.get("/:id", getProductById);
router.put("/:id", updateProduct);
router.patch("/:id/status", updateProductStatus);

export default router;
