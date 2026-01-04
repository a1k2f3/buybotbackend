// routes/category.routes.js
import express from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryTree,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "../controller/Categorycontroller.js";

import { uploadCategoryImage } from "../middleware/uploadCategory.js";
import { getProductsByCategorySlug } from "../controller/productController.js";

const router = express.Router();

// PUBLIC ROUTES
router.get("/tree", getCategoryTree);
router.get("/", getAllCategories);
router.get("/:id", getCategoryById);
router.get("/category/:slug", getProductsByCategorySlug);
// ADMIN ROUTES - Now with Cloudinary image upload!
router.post(
  "/",
  // protect, admin,           // ← Uncomment when auth is ready
  uploadCategoryImage,        // ← This handles image upload
  createCategory
);

router.put(
  "/:id",
  // protect, admin,
  uploadCategoryImage,        // ← Optional: replace image on update
  updateCategory
);

router.delete(
  "/:id",
  // protect, admin,
  deleteCategory
);

export default router;