// controllers/productController.js
import Product from "../models/Product.js";
import Store from "../models/Store.js";
import cloudinary from "../Config/cloudinary.js";
import mongoose from "mongoose";
// BULK CREATE 20+ Products in 1 Request (Perfect for seeding)

export const bulkCreateProducts = async (req, res) => {
  try {
    const products = req.body; // Expect array of product objects

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "Send an array of products" });
    }

    const createdProducts = [];
    const errors = [];

    for (let i = 0; i < products.length; i++) {
      const item = products[i];
      try {
        // Handle tags (string → array)
        let parsedTags = [];
        if (item.tags) {
          parsedTags = typeof item.tags === "string" ? JSON.parse(item.tags) : item.tags;
        }

        const product = await Product.create({
          name: item.name,
          description: item.description,
          price: Number(item.price),
          currency: item.currency || "Rs",
          stock: Number(item.stock),
          status: item.status || "active",
          sku: item.sku,
          category: item.category,
          brand: item.brand,
          tags: parsedTags,
          images: item.images || [], // You can pre-fill Cloudinary URLs
          thumbnail: item.images?.[0]?.url || item.thumbnail || "",
        });

        // Add to store
        if (item.brand) {
          await Store.findByIdAndUpdate(item.brand, { $push: { products: product._id } });
        }

        createdProducts.push(product);
      } catch (err) {
        errors.push({ index: i, name: item.name, error: err.message });
      }
    }

    res.status(201).json({
      success: true,
      message: `${createdProducts.length} products created`,
      failed: errors.length,
      created: createdProducts.length,
      errors,
      data: createdProducts,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// CREATE PRODUCT (Already updated with images)
export const createProduct = async (req, res) => {
  try {
    const {
      name, description, price, currency ,stock,
      status,sku,category, brand, tags
    } = req.body;

    const uploadedImages = req.files?.map(file => ({
      url: file.path,
      public_id: file.filename,
    }));

    if (!uploadedImages || uploadedImages.length === 0) {
      return res.status(400).json({ error: "At least one image is required" });
    }

    let parsedTags = [];
    if (tags) {
      parsedTags = typeof tags === "string" ? JSON.parse(tags) : tags;
    }

    const product = await Product.create({
      name: name?.trim(),
      description: description?.trim(),
      price: Number(price),
      currency,
      stock: Number(stock),
      status,
      sku: sku?.trim().toUpperCase(),
      category,
      brand,
      tags: parsedTags,
      images: uploadedImages,
      thumbnail: uploadedImages[0]?.url || "",
      
    });

    if (brand) {
      await Store.findByIdAndUpdate(brand, { $push: { products: product._id } });
    }

    await product.populate([
      { path: "category", select: "name slug" },
      { path: "brand", select: "name storeName" },
      { path: "tags", select: "name slug color" },
    ]);

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const getRandomProducts = async (req, res) => {
  try {
    const { limit = 12, category, tag, brand } = req.query;

    // Build filter
    const filter = { status: "active", stock: { $gt: 0 } }; // only in-stock

    if (category) filter.category = category;
    if (tag) filter.tags = tag;
    if (brand) filter.brand = brand;

    // Method 1: Fastest - using MongoDB aggregation (Recommended)
    const randomProducts = await Product.aggregate([
      { $match: filter },
      { $sample: { size: Number(limit) } }, // This is the magic line
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "tags",
          localField: "tags",
          foreignField: "_id",
          as: "tags",
        },
      },
      {
        $lookup: {
          from: "stores",
          localField: "brand",
          foreignField: "_id",
          as: "brand",
        },
      },
      { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: 1,
          slug: 1,
          price: 1,
          thumbnail: 1,
          images: { $slice: ["$images", 1] }, // only first image
          rating: 1,
          "category.name": 1,
          "category.slug": 1,
          "brand.name": 1,
          "tags.name": 1,
          "tags.slug": 1,
          "tags.color": 1,
        },
      },
    ]);

    res.json({
      success: true,
      count: randomProducts.length,
      data: randomProducts,
    });
  } catch (error) {
    console.error("Get Random Products Error:", error);
    res.status(500).json({ error: "Failed to fetch random products" });
  }
};
// GET ALL PRODUCTS (with filters, pagination)
export const getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, tag, brand, minPrice, maxPrice, status } = req.query;

    const filter = { status: "active" };
    if (category) filter.category = category;
    if (tag) filter.tags = tag;
    if (brand) filter.brand = brand;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (status) filter.status = status;

    const products = await Product.find(filter)
      .populate("category", "name slug")
      .populate("brand", "name")
      .populate("tags", "name slug color")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(filter);

    res.json({
      success: true,
      count: products.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: products,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET SINGLE PRODUCT BY ID or SLUG
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    let product;

    // Find by ID or slug
    if (mongoose.Types.ObjectId.isValid(id)) {
      product = await Product.findById(id);
    }
    if (!product) {
      product = await Product.findOne({ slug: id });
    }
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Populate main product
    await product.populate([
      { path: "category", select: "name slug" },
      { path: "brand", select: "name storeName" },
      { path: "tags", select: "name slug color" },
      { path: "reviews", populate: { path: "user", select: "name avatar" } },
    ]);

    // ──────────────────────────────
    // FIXED: Safe access to category.id
    // ──────────────────────────────
    const categoryId = product.category?._id || product.category;
    if (!categoryId) {
      console.log("Product has no category:", product._id);
    }

    // Get 8 random related products from SAME CATEGORY (safe fallback)
    const relatedProducts = categoryId
      ? await Product.aggregate([
          {
            $match: {
              category: mongoose.Types.ObjectId.isValid(categoryId)
                ? new mongoose.Types.ObjectId(categoryId)
                : categoryId,
              _id: { $ne: product._id },
              status: "active",
              stock: { $gt: 0 },
            },
          },
          { $sample: { size: 8 } },
          {
            $lookup: {
              from: "categories",
              localField: "category",
              foreignField: "_id",
              as: "category",
            },
          },
          { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "tags",
              localField: "tags",
              foreignField: "_id",
              as: "tags",
            },
          },
          {
            $project: {
              name: 1,
              slug: 1,
              price: 1,
              currency: 1,
              thumbnail: 1,
              images: { $slice: ["$images", 1] },
              rating: 1,
              "category.name": 1,
              "category.slug": 1,
              "tags.name": 1,
              "tags.slug": 1,
              "tags.color": 1,
            },
          },
        ])
      : [];

    res.json({
      success: true,
      data: product,
      relatedProducts: relatedProducts.length > 0 ? relatedProducts : null,
      message: relatedProducts.length > 0
        ? `Found ${relatedProducts.length} related products`
        : "No related products found",
    });
  } catch (error) {
    console.error("Get Product Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// UPDATE PRODUCT (Supports replacing or adding images)
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Handle new images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => ({
        url: file.path,
        public_id: file.filename,
      }));
      updates.images = newImages;
      updates.thumbnail = newImages[0].url;
    }

    // Parse tags if string
    if (updates.tags && typeof updates.tags === "string") {
      updates.tags = JSON.parse(updates.tags);
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate([
      { path: "category", select: "name slug" },
      { path: "brand", select: "name" },
      { path: "tags", select: "name slug color" },
    ]);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// UPDATE PRODUCT STATUS (draft / published / archived)
export const updateProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["draft", "published", "archived"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({
      success: true,
      message: `Product ${status} successfully`,
      data: product,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// SEARCH PRODUCTS (Full-text search)
export const searchProducts = async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: "Search query too short" });
    }

    const products = await Product.find({
      $text: { $search: q },
      status: "published",
    })
      .populate("category", "name")
      .populate("tags", "name color")
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({
      success: true,
      query: q,
      count: products.length,
      data: products,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// SEARCH SUGGESTIONS (Auto-complete)
export const getSearchSuggestions = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ suggestions: [] });

    const suggestions = await Product.find({
      name: { $regex: q, $options: "i" },
      status: "active",
    })
      .select("name slug images thumbnail")
      .limit(10);

    res.json({
      success: true,
      suggestions,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE PRODUCT (Also removes from Store + deletes images from Cloudinary)
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Delete images from Cloudinary
    if (product.images && product.images.length > 0) {
      const deletePromises = product.images.map(img =>
        cloudinary.uploader.destroy(img.public_id)
      );
      await Promise.all(deletePromises);
    }

    // Remove from Store
    if (product.brand) {
      await Store.findByIdAndUpdate(product.brand, {
        $pull: { products: product._id },
      });
    }

    await Product.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};