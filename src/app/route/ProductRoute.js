import express from "express";
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  updateProductStatus,
  searchProducts,
  getSearchSuggestions,
  getRandomProducts,
  bulkCreateProducts
} from "../controller/productController.js";
import { uploadProductImages } from "../middleware/upload.js";

const router = express.Router();

// CREATE Product with multiple images
router.post("/", uploadProductImages, createProduct);
router.post("/bulkproduct", uploadProductImages,bulkCreateProducts);

// UPDATE Product images (optional: replace or add more)
router.put("/:id", uploadProductImages, updateProduct);
router.get("/random",getRandomProducts);//ok use this api for the multiple use
// Other routes
router.get("/", getAllProducts);
router.get("/search", searchProducts);
router.get("/:id", getProductById);
router.get("/suggestions", getSearchSuggestions);
router.patch("/:id/status", updateProductStatus);

export default router;