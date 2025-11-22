import express from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryTree,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "../controller/Categorycontroller.js";

// Optional: Add auth + admin middleware later
// import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

// ========================================
// PUBLIC ROUTES (No auth required)
// ========================================

/**
 * @route   GET /api/categories/tree
 * @desc    Get full nested category tree (with product count) - BEST FOR MENUS & NAVIGATION
 * @access  Public
 */
router.get("/tree", getCategoryTree);

/**
 * @route   GET /api/categories
 * @desc    Get all categories (flat list with parent info & product count)
 * @access  Public
 */
router.get("/", getAllCategories);

/**
 * @route   GET /api/categories/:id
 * @desc    Get single category by ID or SLUG (auto-detects)
 *          Also populates subcategories + product count
 * @access  Public
 */
router.get("/:id", getCategoryById);

// ========================================
// PROTECTED ROUTES (Admin only - uncomment middleware when ready)
// ========================================

/**
 * @route   POST /api/categories
 * @desc    Create new category
 * @access  Private (Admin)
 */
router.post("/", 
  // protect, admin, 
  createCategory
);

/**
 * @route   PUT /api/categories/:id
 * @desc    Update category (name, image, parent, etc.)
 * @access  Private (Admin)
 */
router.put("/:id", 
  // protect, admin, 
  updateCategory
);

/**
 * @route   DELETE /api/categories/:id
 * @desc    Soft delete category (blocks if has children or products)
 * @access  Private (Admin)
 */
router.delete("/:id", 
  // protect, admin, 
  deleteCategory
);

export default router;