import Category from "../models/Category.js";
import mongoose from "mongoose";

// ──────────────────────────────────────────────────────────────
// Helper: Build full nested category tree with product count (lightweight)
// ──────────────────────────────────────────────────────────────
const buildCategoryTree = async (parentId = null) => {
  const categories = await Category.find({
    parentCategory: parentId,
    isActive: true,
  })
    .select("name slug description image parentCategory")
    .sort({ name: 1 }) // Alphabetical order looks better in UI
    .lean(); // Use lean() for performance

  const tree = await Promise.all(
    categories.map(async (cat) => {
      const children = await buildCategoryTree(cat._id);

      // Get product count using virtual (super fast!)
      const populatedCat = await Category.findById(cat._id).populate("productCount");
      const productCount = populatedCat.productCount || 0;

      return {
        _id: cat._id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        image: cat.image,
        productCount,
        subcategories: children.length > 0 ? children : undefined,
      };
    })
  );

  return tree;
};

// ──────────────────────────────────────────────────────────────
// CREATE Category
// ──────────────────────────────────────────────────────────────
export const createCategory = async (req, res) => {
  try {
    const { name, description, parentCategory, image } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: "Category name is required" });
    }

    // Check if parent exists
    if (parentCategory) {
      const parent = await Category.findById(parentCategory);
      if (!parent) return res.status(400).json({ error: "Parent category not found" });
    }

    const category = new Category({
      name: name.trim(),
      description: description?.trim(),
      parentCategory: parentCategory || null,
      image: image || { url: "", public_id: "" },
    });

    const savedCategory = await category.save();
    await savedCategory.populate("parentCategory", "name slug image");

    return res.status(201).json({
      success: true,
      data: savedCategory,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Category with this name already exists" });
    }
    return res.status(400).json({ error: err.message });
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

// ──────────────────────────────────────────────────────────────
// GET Nested Category Tree (Best for Frontend Menus)
// ──────────────────────────────────────────────────────────────
export const getCategoryTree = async (req, res) => {
  try {
    const tree = await buildCategoryTree();
    res.json({
      success: true,
      count: tree.length,
      data: tree,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ──────────────────────────────────────────────────────────────
// GET Single Category by ID or Slug (with products & subcategories)
// ──────────────────────────────────────────────────────────────
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
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.parentCategory === id) {
      return res.status(400).json({ error: "Category cannot be its own parent" });
    }

    if (updates.parentCategory) {
      const parent = await Category.findById(updates.parentCategory);
      if (!parent) return res.status(400).json({ error: "Parent category not found" });
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate("parentCategory", "name slug")
      .populate("productCount");

    if (!updatedCategory) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json({
      success: true,
      data: {
        ...updatedCategory.toObject(),
        productCount: updatedCategory.productCount || 0,
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Category name already exists" });
    }
    res.status(400).json({ error: err.message });
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