import Category from "../models/Category.js";
import mongoose from "mongoose";

// ──────────────────────────────────────────────────────────────
// Helper: Build full nested category tree with product count (lightweight)
// ──────────────────────────────────────────────────────────────
// SAFE & PRODUCTION READY – works even with broken data
const buildCategoryTree = async () => {
  try {
    const pipeline = [
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "category",
          as: "products",
        },
      },
      {
        $addFields: {
          productCount: { $size: "$products" },
        },
      },
      {
        $project: {
          products: 0, // remove heavy array
          __v: 0,
        },
      },
    ];

    const categories = await Category.aggregate(pipeline);

    // Now build tree (same as before)
    const map = new Map();
    const tree = [];

    categories.forEach(cat => {
      const node = {
        _id: cat._id,
        name: cat.name,
        slug: cat.slug,
        image: cat.image || { url: "/fallback-category.jpg" },
        productCount: cat.productCount || 0,
        children: [],
      };
      map.set(cat._id, node);
      if (!cat.parentCategory) tree.push(node);
    });

    categories.forEach(cat => {
      if (cat.parentCategory && map.has(cat.parentCategory)) {
        map.get(cat.parentCategory).children.push(map.get(cat._id));
      }
    });

    return tree;
  } catch (err) {
    {
    console.error(err);
    return [];
  }
};
}
let cachedTree = null;
let cacheTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
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
    console.log("=== getCategoryTree called ===");

    // Clear cache to force fresh build
    cachedTree = null;

    const tree = await buildCategoryTree();

    console.log("Tree built successfully:", tree.length, "root categories");

    res.json({
      success: true,
      data: tree,
      count: tree.length,
    });
  } catch (err) {
    // THIS IS THE KEY — SHOW THE REAL ERROR
    console.error("getCategoryTree FAILED:", err);
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Stack:", err.stack);

    res.status(500).json({
      success: false,
      error: "Failed to build category tree",
      details: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
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
    if (!category) {
      category = await Category.findOne({ slug: id, isActive: true });
    }

    if (!category || !category.isActive) {
      return res.status(404).json({ error: "Category not found" });
    }

    await category.populate([
      { path: "parentCategory", select: "name slug image" },
      { path: "subcategories", select: "name slug image" },
      "productCount"
    ]);

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