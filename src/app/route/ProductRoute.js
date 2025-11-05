import express from "express";
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  updateProductStatus,
  searchProducts,
  getSearchSuggestions,
} from "../controller/productController.js";

const router = express.Router();
// product route
router.post("/", createProduct);
router.get("/", getAllProducts);
router.get("/search", searchProducts);
router.get("/:id", getProductById);
router.put("/:id", updateProduct);
router.get("/suggestions", getSearchSuggestions); 
router.patch("/:id/status", updateProductStatus);

export default router;
