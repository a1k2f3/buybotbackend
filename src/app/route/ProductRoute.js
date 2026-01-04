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
  bulkCreateProducts,
  getProductsByBrand,
  getProductsByTag,
  deleteProduct,
  getSmartTrending,
  getProductsByCategorySlug
} from "../controller/productController.js";
import { uploadProductMedia } from "../middleware/upload.js";
const router = express.Router();
// CREATE Product with multiple images
router.post("/", uploadProductMedia, createProduct);
router.post("/bulkproduct", uploadProductMedia, bulkCreateProducts);
// UPDATE Product images (optional: replace or add more)
router.put("/:id", uploadProductMedia, updateProduct);
router.get("/random",getRandomProducts);//ok use this api for the multiple use
// Other routes
router.get("/", getAllProducts);
router.get("/tag/:tag", getProductsByTag);

router.get("/trending", getProductsByTag);
router.get("/smarttrending",getSmartTrending);
router.delete("/delete/:id",deleteProduct);
// getTrendingProducts
router.get("/category/:slug", getProductsByCategorySlug);
router.get("/search", searchProducts);
router.get("/:id", getProductById);
router.get("/search/suggestions", getSearchSuggestions);
router.get("/getstoreproducts", getProductsByBrand);
router.get("/suggestions", getSearchSuggestions);
router.patch("/:id/status", updateProductStatus);
export default router;