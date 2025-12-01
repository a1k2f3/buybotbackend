import Category from "../models/Category.js";
import mongoose from "mongoose";

// ──────────────────────────────────────────────────────────────
// Helper: Build full nested category tree with product count (lightweight)
// ──────────────────────────────────────────────────────────────
let cachedTree = null;
let cacheTime = null;
const CACHE_DURATION = 5 * 60 * 1000;
const buildCategoryTree = async () => {
  try {
    // Fetch only needed fields + lean for speed
    const categories = await Category.find({})
      .select("name slug image productCount parent")
      .lean()
      .exec();

    const map = {};
    const tree = [];

    // First pass: create map
    categories.forEach((cat) => {
      const item = {
        _id: cat._id,
        name: cat.name,
        slug: cat.slug,
        image: cat.image,
        productCount: cat.productCount || 0,
        children: [],
      };
      map[cat._id] = item;

      // If no parent or parent not found → root
      if (!cat.parent || !map[cat.parent]) {
        tree.push(item);
      }
    });

    // Second pass: attach children
    categories.forEach((cat) => {
      if (cat.parent && map[cat.parent]) {
        map[cat.parent].children.push(map[cat._id]);
      }
    });

    return tree;
  } catch (err) {
    console.error("buildCategoryTree error:", err);
    throw err;
  }
};
 // 5 minutes
// ──────────────────────────────────────────────────────────────
// CREATE Category
// ──────────────────────────────────────────────────────────────
// controller/Categorycontroller.js

export const createCategory = async (req, res) => {
  try {
    const { name, description, parentCategory } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: "Category name is required" });
    }

    // Declare image object
    let image = req.file
      ? {
          url: req.file.path,
          public_id: req.file.filename,
        }
      : null; // <-- Do NOT insert empty url values

    const category = await Category.create({
      name: name.trim(),
      description: description?.trim() || "",
      parentCategory: parentCategory || null,
      image,
    });

    await category.populate("parentCategory", "name slug");

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "Category name already exists" });
    }
    res.status(500).json({ error: error.message });
  }
};

export const getCategoryTree = async (req, res) => {
  try {
    // Return cached version if fresh (blazing fast on warm Vercel functions)
    if (cachedTree && cacheTime && Date.now() - cacheTime < CACHE_DURATION) {
      return res.status(200).json({
        success: true,
        data: cachedTree,
        cached: true,
      });
    }

    // Build fresh tree (only on cold start or cache expired)
    console.log("Building fresh category tree...");
    const tree = await Promise.race([
      buildCategoryTree(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Category tree build timeout")), 7500)
      ), // 7.5s max – safe for Vercel 10s limit
    ]);

    // Cache it
    cachedTree = tree;
    cacheTime = Date.now();

    res.status(200).json({
      success: true,
      data: tree,
      count: tree.length,
      cached: false,
    });
  } catch (err) {
    console.error("getCategoryTree error:", err.message);

    // Graceful fallback – return empty tree instead of crashing
    res.status(200).json({
      success: true,
      data: [], // Don't break frontend
      error: "Categories temporarily unavailable",
      fallback: true,
    });
  }
};
// ──────────────────────────────────────────────────────────────
// GET All Categories (Flat + with product count)
// ──────────────────────────────────────────────────────────────
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .populate("parentCategory", "name slug")
      .populate("productCount")
      .select("-__v")
      .sort({ name: 1 });

    res.json({
      success: true,
      count: categories.length,
      data: categories.map((cat) => ({
        ...cat.toObject(),
        productCount: cat.productCount || 0,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    let category;

    if (mongoose.Types.ObjectId.isValid(id)) {
      category = await Category.findById(id);
    }

    // Fallback to slug
    if (!category) {
      category = await Category.findOne({ slug: id, isActive: true });
    }

    if (!category || !category.isActive) {
      return res.status(404).json({ error: "Category not found" });
    }

    await category
      .populate("parentCategory", "name slug image")
      .populate("subcategories", "name slug image")
      .populate("productCount");

    res.json({
      success: true,
      data: {
        ...category.toObject(),
        productCount: category.productCount || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ──────────────────────────────────────────────────────────────
// UPDATE Category
// ──────────────────────────────────────────────────────────────
// updateCategory (supports replacing image)
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // If new image uploaded
    if (req.file) {
      updates.image = {
        url: req.file.path,
        public_id: req.file.filename,
      };
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate("parentCategory", "name slug");

    if (!updatedCategory) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json({
      success: true,
      message: "Category updated successfully",
      data: updatedCategory,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// DELETE Category (Soft Delete + Block if has products or children)
// ──────────────────────────────────────────────────────────────
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Check subcategories
    const hasChildren = await Category.exists({ parentCategory: id });
    if (hasChildren) {
      return res.status(400).json({
        error: "Cannot delete category with subcategories. Reassign or delete children first.",
      });
    }

    // Check if category has products
    const hasProducts = await category.populate("productCount");
    if (hasProducts.productCount > 0) {
      return res.status(400).json({
        error: `Cannot delete category with ${hasProducts.productCount} product(s). Move or delete products first.`,
      });
    }

    // Soft delete
    category.isActive = false;
    await category.save();

    res.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};