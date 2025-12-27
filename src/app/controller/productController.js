// controllers/productController.js
import Product from "../models/Product.js";
import Store from "../models/Store.js";
// import cloudinary from "../Config/cloudinary.js";
import mongoose from "mongoose";
import Tag from "../models/Tag.js";
import Category from "../models/Category.js";
import Fuse from 'fuse.js';
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
      name,
      description,
      price,
      currency,
      stock,
      status,
      sku,
      category,
      brand,
      tags, // this will be string | string[] from multipart
    } = req.body;

    // Safely handle files
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: "At least one image is required" });
    }

    const uploadedImages = req.files.map((file) => ({
      url: file.path,
      public_id: file.filename,
    }));

    // Safely handle tags — multipart sends them as array or single string
    let tagsArray = [];
    if (tags) {
      if (Array.isArray(tags)) {
        tagsArray = tags;
      } else if (typeof tags === "string") {
        tagsArray = [tags];
      }
    }

    // Create product
    const product = await Product.create({
      name: name?.trim() || "",
      description: description?.trim() || "",
      price: Number(price),
      currency: currency || "INR", // or "RS" — match your schema
      stock: Number(stock),
      status: status || "active",
      sku: sku?.trim().toUpperCase(),
      category,
      brand,
      tags: tagsArray,
      images: uploadedImages,
      thumbnail: uploadedImages[0]?.url || "",
    });

    // Update store with new product
    if (brand) {
      await Store.findByIdAndUpdate(brand, { $push: { products: product._id } });
    }

    // Populate related fields
    await product.populate([
      { path: "category", select: "name slug" },
      { path: "brand", select: "name storeName" },
      { path: "tags", select: "name slug color" },
    ]);

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    console.error("Product creation error:", error); // ← This will show the real error in your server terminal
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};
export const getRandomProducts = async (req, res) => {
  try {
    const { category, tag, brand } = req.query;

    // Build filter
    const filter = { status: "active", stock: { $gt: 0 } }; // only in-stock

    if (category) filter.category = category;
    if (tag) filter.tags = tag;
    if (brand) filter.brand = brand;

    // Get the count of matching products
    const count = await Product.countDocuments(filter);

    // Method 1: Fastest - using MongoDB aggregation (Recommended)
    const randomProducts = await Product.aggregate([
      { $match: filter },
      { $sample: { size: count } }, // Sample all to get random order
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
          "brand.address": 1,
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
// api/products/trending.js or add to your existing controller
// controllers/productController.js or api/products/trending.js

export const getProductsByTag = async (req, res) => {
  try {
    const { slug } = req.params;
    const { limit = 12 } = req.query;
    const limitNum = parseInt(limit, 10);

    // 1️⃣ Find tag by slug
    const tag = await Tag.findOne({
      slug,
      isActive: true,
    }).select("_id");

    if (!tag) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
      });
    }

    // 2️⃣ Fetch products having this tag
    const products = await Product.find({
      status: "active",
      stock: { $gt: 0 },
      tags: tag._id, // 👈 IMPORTANT
    })
      .populate("category", "name slug")
      .populate("brand", "name")
      .populate("tags", "name slug color")
      .select(
        "name slug price currency thumbnail images rating views totalSold"
      )
      .limit(limitNum)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error("Get Products By Tag Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch products by tag",
      error: error.message,
    });
  }
};

const getSmartTrending = async (limit) => {
  return await Product.aggregate([
    {
      $match: {
        status: "active",
        stock: { $gt: 0 },
      },
    },
    {
      $addFields: {
        popularityScore: {
          $add: [
            { $multiply: ["$views", 1] },         // 1 point per view
            { $multiply: ["$totalSold", 10] },    // 10 points per sale
          ],
        },
      },
    },
    { $sort: { popularityScore: -1 } },
    { $limit: limit * 3 }, // Get more candidates
    { $sample: { size: limit } }, // Randomize top performers
    ...lookupPipeline(),
  ]);
};

// Reusable lookup pipeline (same as your original)
const lookupPipeline = () => [
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
      currency: 1,
      thumbnail: 1,
      images: { $slice: ["$images", 1] },
      rating: 1,
      views: 1,
      totalSold: 1,
      trending: 1,
      "category.name": 1,
      "category.slug": 1,
      "brand.name": 1,
      "brand.logo": 1,
      "tags.name": 1,
      "tags.slug": 1,
      "tags.color": 1,
    },
  },
];
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
      product = await Product.findById(id).populate("brand");
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
export const getProductsByBrand = async (req, res) => {
  try {
    const { brandId } = req.query;
    // 1. Must have brandId
    if (!brandId) {
      return res.status(400).json({ error: "brandId is required" });
    }
    // 2. Must be valid ObjectId string
    if (!mongoose.Types.ObjectId.isValid(brandId)) {
      return res.status(400).json({ error: "Invalid brandId format" });
    }
    // 3. THIS IS THE LINE THAT FIXES EVERYTHING
   const products = await Product.find({
  brand: new mongoose.Types.ObjectId(brandId),
  status: "active",
})
  .select("name price images stock sku category tags")
  .populate("category", "name")
  .populate("tags", "name color");
    // 4. Return empty array instead of 404 (better for frontend)
    return res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });

  } catch (err) {
    console.error("getProductsByBrand error:", err);
    return res.status(500).json({ error: "Server error" });
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
// Install fuse.js: npm install fuse.js
// const Fuse = require('fuse.js');


export const searchProducts = async (req, res) => {
  try {
    const { q, page = 2, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: "Search query too short" });
    }

    // Fetch all active products with populated fields
    const allProducts = await Product.find({ status: "active" })
      .populate("category", "name slug")
      .populate("tags", "name color")
      .populate("brand", "name");

    // Create Fuse instance for fuzzy search across multiple fields
    const fuse = new Fuse(allProducts, {
      keys: ['name', 'description', 'category.name', 'brand.name', 'tags.name'],
      threshold: 0.4, // Adjust threshold for fuzziness (0 = exact, 1 = very loose)
      includeScore: true // Include score for sorting by relevance
    });

    // Perform the search
    const matches = fuse.search(q.trim());

    // Apply pagination to the matched results
    const pagedMatches = matches.slice((page - 1) * limit, page * limit);

    // Extract the product items
    const products = pagedMatches.map(match => match.item);

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

    if (!q || q.trim().length < 2) {
      return res.json({ success: true, suggestions: [] });
    }

    const query = q.trim();

    // Fetch active products with necessary populated fields
    const products = await Product.find({ status: "active" })
      .select("name slug description thumbnail images category brand tags") // only what we need
      .populate("category", "name")
      .populate("brand", "name")
      .populate("tags", "name");

    if (products.length === 0) {
      return res.json({ success: true, suggestions: [] });
    }

    // Setup Fuse for fuzzy matching
    const fuse = new Fuse(products, {
      keys: [
        { name: 'name', weight: 0.6 },           // highest priority
        { name: 'description', weight: 0.2 },
        { name: 'category.name', weight: 0.1 },
        { name: 'brand.name', weight: 0.1 },
        { name: 'tags.name', weight: 0.1 },
      ],
      threshold: 0.4,           // same as main search for consistency
      includeScore: true,
      shouldSort: true,
    });

    // Get top 10 best matches
    const results = fuse.search(query, { limit: 10 });

    // Map to clean suggestion format (only essential data for dropdown)
    const suggestions = results.map(({ item }) => ({
      _id: item._id,
      name: item.name,
      slug: item.slug,
      thumbnail: item.thumbnail || (item.images[0]?.url || null),
    }));

    res.json({
      success: true,
      suggestions,
    });
  } catch (error) {
    console.error("Search suggestions error:", error);
    res.status(500).json({ error: "Internal server error" });
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