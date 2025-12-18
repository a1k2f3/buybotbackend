import Product from "../models/Product.js";
import Tag from "../models/Tag.js";
import mongoose from "mongoose";

// CREATE Tag (Admin only later)
export const createManyTags = async (req, res) => {
  try {
    const tags = req.body; // Expecting an array of tag objects

    // Validation: Must be an array
    if (!Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({
        error: "Please provide a non-empty array of tags",
      });
    }

    // Clean and prepare tags
    const preparedTags = tags.map((tag) => ({
      name: tag.name?.trim(),
      description: tag.description?.trim(),
      color: tag.color || "#6366f1", // default color
    }));

    // Insert many + ignore duplicates (perfect for seeding)
    const result = await Tag.insertMany(preparedTags, {
      ordered: false,     // Continue even if one fails (duplicate)
      rawResult: true,    // Get detailed response
    });

    // Extract successfully created tags
    const createdTags = Object.values(result.insertedDocs || {}).map(doc => ({
      _id: doc._id,
      name: doc.name,
      slug: doc.slug,
      color: doc.color,
    }));

    res.status(201).json({
      success: true,
      message: `${createdTags.length} tags created successfully`,
      skipped: tags.length - createdTags.length,
      data: createdTags,
    });
  } catch (err) {
    if (err.writeErrors) {
      // Some were skipped due to duplicates
      const createdCount = err.result?.nInserted || 0;
      res.status(201).json({
        success: true,
        message: `${createdCount} tags created, some skipped (already exist)`,
        data: err.insertedDocs || [],
      });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
};
export const createTag = async (req, res) => {
  try {
    const { name, description, color } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: "Tag name is required" });
    }

    const tag = new Tag({
      name: name.trim(),
      description: description?.trim(),
      color: color || "#6366f1",
    });

    const savedTag = await tag.save();

    res.status(201).json({
      success: true,
      data: savedTag,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Tag already exists" });
    }
    res.status(400).json({ error: err.message });
  }
};

// GET All Tags (with product count)
export const getAllTags = async (req, res) => {
  try {
    const tags = await Tag.find({ isActive: true })
      .select("name slug color description")
      .populate("productCount")
      .sort({ name: 1 });

    res.json({
      success: true,
      count: tags.length,
      data: tags.map(tag => ({
        ...tag.toObject(),
        productCount: tag.productCount || 0,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET Single Tag by ID or Slug + Its Products
export const getTagById = async (req, res) => {
  try {
    const { id } = req.params;
    let tag;

    if (mongoose.Types.ObjectId.isValid(id)) {
      tag = await Tag.findById(id);
    }
    if (!tag) {
      tag = await Tag.findOne({ slug: id, isActive: true });
    }
    if (!tag) {
      return res.status(404).json({ error: "Tag not found" });
    }
   await tag.populate({
      path: "products",
      select: "name price images slug rating",
      match: { isActive: true },
      options: { limit: 20, sort: { createdAt: -1 } },
    }).populate("productCount");

    res.json({
      success: true,
      data: {
        ...tag.toObject(),
        productCount: tag.productCount || 0,
        products: tag.products || [],
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE Tag
export const updateTag = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedTag = await Tag.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate("productCount")
      .select("-__v");

    if (!updatedTag) {
      return res.status(404).json({ error: "Tag not found" });
    }

    res.json({
      success: true,
      data: {
        ...updatedTag.toObject(),
        productCount: updatedTag.productCount || 0,
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Tag name already exists" });
    }
    res.status(400).json({ error: err.message });
  }
};

// DELETE Tag (Soft delete)
export const deleteTag = async (req, res) => {
  try {
    const { id } = req.params;
    const tag = await Tag.findById(id);

    if (!tag) {
      return res.status(404).json({ error: "Tag not found" });
    }

    tag.isActive = false;
    await tag.save();

    res.json({
      success: true,
      message: "Tag deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// controllers/productController.js or api/products/trending-by-tags.js


