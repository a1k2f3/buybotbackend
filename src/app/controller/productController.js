// controllers/productController.js
import Product from "../models/Product.js";
import Store from "../models/Store.js";
import cloudinary from "../Config/cloudinary.js";
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
      discountPrice,
      currency = "RS",
      stock,
      status = "active",
      sku,
      category,
      brand,
      tags,
      specifications,
      warranty,
      size,
      ageGroup,
    } = req.body;

    // Validate required fields
    if (!name?.trim()) {
      return res.status(400).json({ error: "Product name is required" });
    }
    if (!price || isNaN(price) || Number(price) <= 0) {
      return res.status(400).json({ error: "Valid price is required" });
    }
    if (!stock || isNaN(stock) || Number(stock) < 0) {
      return res.status(400).json({ error: "Valid stock quantity is required" });
    }
    if (!category) {
      return res.status(400).json({ error: "Category is required" });
    }

    // Process uploaded files
    const files = req.files ? Object.values(req.files).flat() : [];

    // Check if files were uploaded
    if (files.length === 0) {
      return res.status(400).json({ error: "At least one image is required" });
    }

    // Process uploaded files (images + videos) with Cloudinary eager thumbnail support
    const uploadedImages = [];
    const uploadedVideos = [];

    files.forEach((file) => {
      // Cloudinary attaches upload result to the file object
      const uploaded = file;

      const item = {
        url: uploaded.secure_url || uploaded.path, // secure_url is preferred
        public_id: uploaded.public_id || uploaded.filename,
      };

      // === VIDEO THUMBNAIL EXTRACTION ===
      if (
        file.mimetype.startsWith("video/") &&
        uploaded.eager &&
        Array.isArray(uploaded.eager) &&
        uploaded.eager[0]
      ) {
        item.thumbnail = uploaded.eager[0].secure_url; // Auto-generated thumbnail
      }

      // Route to images or videos based on fieldname
      if (file.fieldname === "images") {
        uploadedImages.push(item);
      } else if (file.fieldname === "videos") {
        uploadedVideos.push(item);
      }
    });

    // Ensure at least one image
    if (uploadedImages.length === 0) {
      return res.status(400).json({ error: "At least one image is required" });
    }

    // Handle tags
    let tagsArray = [];
    if (tags) {
      let tempTags = tags;
      if (typeof tempTags === "string") {
        tempTags = tempTags.trim();
        if (tempTags.startsWith('[') && tempTags.endsWith(']')) {
          try {
            tempTags = JSON.parse(tempTags);
          } catch (err) {
            // If parse fails, fall back to split
          }
        }
      }
      if (Array.isArray(tempTags)) {
        tagsArray = tempTags.flatMap((t) => {
          if (typeof t === "string") {
            return t.trim() ? [t.trim()] : [];
          }
          return [];
        });
      } else if (typeof tempTags === "string") {
        tagsArray = tempTags.split(",").map((t) => t.trim()).filter(Boolean);
      }
    }

    // Handle size array
    let sizeArray = [];
    if (size) {
      if (Array.isArray(size)) {
        sizeArray = size.map((s) => s.trim().toUpperCase()).filter(Boolean);
      } else if (typeof size === "string") {
        sizeArray = size.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
      }
    }

    // Parse specifications
    let specsMap = new Map();
    if (specifications) {
      try {
        const parsed =
          typeof specifications === "string"
            ? JSON.parse(specifications)
            : specifications;

        if (typeof parsed === "object" && parsed !== null) {
          Object.entries(parsed).forEach(([key, value]) => {
            if (typeof value === "string" || typeof value === "number") {
              specsMap.set(key.trim(), String(value).trim());
            }
          });
        }
      } catch (err) {
        return res.status(400).json({ error: "Invalid specifications format" });
      }
    }

    // Validate discountPrice
    const finalDiscountPrice = discountPrice ? Number(discountPrice) : undefined;
    if (
      finalDiscountPrice !== undefined &&
      (isNaN(finalDiscountPrice) || finalDiscountPrice >= Number(price))
    ) {
      return res.status(400).json({
        error: "Discount price must be less than original price",
      });
    }

    // Create product
    const product = await Product.create({
      name: name.trim(),
      description: description?.trim() || "",
      price: Number(price),
      discountPrice: finalDiscountPrice,
      currency,
      stock: Number(stock),
      status,
      sku: sku?.trim().toUpperCase() || null,
      category,
      brand: brand || null,
      tags: tagsArray,
      images: uploadedImages,
      videos: uploadedVideos, // Now includes thumbnail for each video
      thumbnail: uploadedImages[0]?.url || "",
      specifications: specsMap,
      warranty: warranty?.trim() || null,
      size: sizeArray,
      ageGroup: ageGroup || null,
    });

    // Update store (brand) with new product
    if (brand) {
      await Store.findByIdAndUpdate(brand, { $push: { products: product._id } });
    }

    // Populate related fields
    await product.populate([
      { path: "category", select: "name slug" },
      { path: "brand", select: "name storeName logo" },
      { path: "tags", select: "name slug color" },
    ]);

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    console.error("Product creation error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};
export const getRandomProducts = async (req, res) => {
  try {
    const { category, tag, brand } = req.query;

    // Fixed limit: always 10 products max for speed
    const LIMIT = 10;

    // Build filter: only active & in-stock products
    const filter = {
      status: "active",
      stock: { $gt: 0 },
    };

    if (category) filter.category = category;
    if (tag) filter.tags = tag;
    if (brand) filter.brand = brand;

    // Efficient aggregation: match → random sample (10) → populate → project
    const randomProducts = await Product.aggregate([
      { $match: filter },

      // Get exactly 10 random products (fastest method)
      { $sample: { size: LIMIT } },

      // Populate category
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },

      // Populate brand (store)
      {
        $lookup: {
          from: "stores",
          localField: "brand",
          foreignField: "_id",
          as: "brand",
        },
      },
      { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },

      // Populate tags
      {
        $lookup: {
          from: "tags",
          localField: "tags",
          foreignField: "_id",
          as: "tags",
        },
      },

      // Project only needed fields (minimal data transfer)
      {
        $project: {
          _id: 1,
          name: 1,
          slug: 1,
          price: 1,
          discountPrice: 1,
          thumbnail: 1,
          images: { $slice: ["$images", 1] }, // Only first image
          stock: 1,
          "category._id": 1,
          "category.name": 1,
          "category.slug": 1,
          "brand._id": 1,
          "brand.name": 1,
          "tags._id": 1,
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
    console.error("Get Random Products Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
    });
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
const commonLookupPipeline = () => [
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
export const getProductsByCategorySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    // 1️⃣ Find category by slug
    const category = await Category.findOne({ slug });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // 2️⃣ Find products using category _id
    const products = await Product.find({
      category: category._id,
      status: "active",
    })
      .populate("category", "name slug")
      .populate("brand", "name")
      .populate("tags", "name")
      .sort({ createdAt: -1 });

    if (!products.length) {
      return res.status(404).json({
        success: false,
        message: "No products found for this category",
      });
    }

    res.status(200).json({
      success: true,
      category: {
        id: category._id,
        name: category.name,
        slug: category.slug,
      },
      count: products.length,
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
export const getSmartTrending = async (limit = 10) => {
  return await Product.aggregate([
    { $match: { status: "active", stock: { $gt: 0 } } },
    {
      $addFields: {
        popularityScore: {
          $add: [
            { $multiply: [{ $ifNull: ["$views", 0] }, 1] },
            { $multiply: [{ $ifNull: ["$totalSold", 0] }, 10] },
          ],
        },
      },
    },
    { $sort: { popularityScore: -1 } },
    { $limit: limit * 3 },
    { $sample: { size: limit } },
    ...commonLookupPipeline(),
    { $project: { popularityScore: 0 } }, // Clean up temp field
  ]);
};
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

    if (!id) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    const updates = { ...req.body };

    // === 1. Process New Uploaded Files (Images + Videos with Thumbnails) ===
    let newImages = [];
    let newVideos = [];

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      req.files.forEach((file) => {
        // Cloudinary upload result is attached to file object
        const uploaded = file;

        const item = {
          url: uploaded.secure_url || uploaded.path, // secure_url is preferred
          public_id: uploaded.public_id || uploaded.filename,
        };

        // === VIDEO THUMBNAIL EXTRACTION ===
        if (
          file.mimetype.startsWith("video/") &&
          uploaded.eager &&
          Array.isArray(uploaded.eager) &&
          uploaded.eager[0]
        ) {
          item.thumbnail = uploaded.eager[0].secure_url; // Auto-generated thumbnail
        }

        // Classify as image or video based on fieldname
        if (file.fieldname === "images" || !file.fieldname.includes("video")) {
          newImages.push(item);
        } else {
          newVideos.push(item);
        }
      });

      // Update product thumbnail if new images are uploaded (use first new image)
      if (newImages.length > 0) {
        updates.thumbnail = newImages[0].url;
      }
    }

    // === 2. Fetch existing product ===
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    // === 3. Merge New Images (append) ===
    if (newImages.length > 0) {
      updates.images = [...existingProduct.images, ...newImages];
    }

    // === 4. Merge New Videos (append with thumbnails) ===
    if (newVideos.length > 0) {
      updates.videos = [...existingProduct.videos, ...newVideos];
    }

    // === 5. Handle Tags ===
    if (updates.tags !== undefined) {
      if (typeof updates.tags === "string") {
        try {
          updates.tags = JSON.parse(updates.tags);
        } catch (err) {
          updates.tags = updates.tags.split(",").map((t) => t.trim()).filter(Boolean);
        }
      }
      if (Array.isArray(updates.tags)) {
        updates.tags = updates.tags.filter(Boolean);
      } else {
        delete updates.tags;
      }
    }

    // === 6. Handle Size ===
    if (updates.size !== undefined) {
      let sizeArray = [];
      if (Array.isArray(updates.size)) {
        sizeArray = updates.size;
      } else if (typeof updates.size === "string") {
        sizeArray = updates.size.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
      }
      updates.size = sizeArray;
    }

    // === 7. Handle Specifications (Map) ===
    if (updates.specifications !== undefined) {
      let specsMap = new Map();
      try {
        const input =
          typeof updates.specifications === "string"
            ? JSON.parse(updates.specifications)
            : updates.specifications;

        if (input && typeof input === "object") {
          Object.entries(input).forEach(([key, value]) => {
            if (typeof value === "string" || typeof value === "number") {
              specsMap.set(key.trim(), String(value).trim());
            }
          });
        }
      } catch (err) {
        return res.status(400).json({ error: "Invalid specifications format. Must be valid JSON object." });
      }
      updates.specifications = specsMap;
    }

    // === 8. Validate Price & Discount Price ===
    if (updates.price !== undefined) {
      updates.price = Number(updates.price);
      if (isNaN(updates.price) || updates.price <= 0) {
        return res.status(400).json({ error: "Price must be a positive number" });
      }
    }

    if (updates.discountPrice !== undefined) {
      if (updates.discountPrice === "" || updates.discountPrice === null || updates.discountPrice === "null") {
        updates.discountPrice = null;
      } else {
        updates.discountPrice = Number(updates.discountPrice);
        if (isNaN(updates.discountPrice) || updates.discountPrice < 0) {
          return res.status(400).json({ error: "Discount price must be a non-negative number" });
        }
        const finalPrice = updates.price ?? existingProduct.price;
if (updates.discountPrice >= finalPrice) {
  return res.status(400).json({ error: "Discount price must be less than the original price" });
}
      }
    }

    // === 9. Clean String Fields ===
    if (updates.name !== undefined) updates.name = updates.name.trim();
    if (updates.description !== undefined) updates.description = updates.description?.trim() || "";
    if (updates.warranty !== undefined) updates.warranty = updates.warranty?.trim() || null;
    if (updates.sku !== undefined) updates.sku = updates.sku?.trim().toUpperCase() || null;
    if (updates.currency !== undefined) updates.currency = updates.currency.trim();

    // === 10. Perform Update ===
    const product = await Product.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true, context: "query" }
    ).populate([
      { path: "category", select: "name slug" },
      { path: "brand", select: "name storeName logo" },
      { path: "tags", select: "name slug color" },
    ]);

    if (!product) {
      return res.status(404).json({ error: "Product not found after update" });
    }

    return res.json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    console.error("Product update error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to update product",
    });
  }
};
// UPDATE PRODUCT STATUS (draft / published / archived)
export const updateProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["draft", "active", "inactive"].includes(status)) {
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