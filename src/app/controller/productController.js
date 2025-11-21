import Product from "../models/Product.js";
import Store from "../models/Store.js";

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
      images,
      category,
      brand,      // storeId
      tags,
      reviews
    } = req.body;
    // 1. Create product
    const product = await Product.create({
      name,
      description,
      price,
      currency,
      stock,
      status,
      sku,
      images,
      category,
      brand,
      tags,
      reviews
    });
    // 2. Add product to the Store (brand == storeId)
    if (brand) {
      await Store.findByIdAndUpdate(
        brand,
        { $push: { products: product._id } },
        { new: true }
      );
    }

    // 3. Response
    res.status(201).json({
      message: "Product created successfully and added to store",
      product
    });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


// Get All Products
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("category brand tags reviews");
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Product by ID
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category brand tags reviews");
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update Product
export const updateProduct = async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedProduct) return res.status(404).json({ message: "Product not found" });
    res.status(200).json(updatedProduct);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
export const getSearchSuggestions = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim() === "") {
      return res.status(400).json({ message: "Please provide a search query" });
    }

    const regex = new RegExp(query, "i");

    // Fetch limited suggestions for better performance
    const products = await Product.find({ name: regex }).limit(5).select("name");
    const categories = await Category.find({ name: regex }).limit(5).select("name");
    const stores = await Store.find({ name: regex }).limit(5).select("name");
    const tags = await Tag.find({ name: regex }).limit(5).select("name");

    res.status(200).json({
      products: products.map((p) => p.name),
      categories: categories.map((c) => c.name),
      stores: stores.map((s) => s.name),
      tags: tags.map((t) => t.name),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const searchProducts = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim() === "") {
      return res.status(400).json({ message: "Please provide a search query" });
    }

    // Find category, tag, and store IDs matching the search query
    const categories = await Category.find({ name: { $regex: query, $options: "i" } });
    const tags = await Tag.find({ name: { $regex: query, $options: "i" } });
    const stores = await Store.find({ name: { $regex: query, $options: "i" } });

    // Extract their IDs
    const categoryIds = categories.map((c) => c._id);
    const tagIds = tags.map((t) => t._id);
    const storeIds = stores.map((s) => s._id);

    // Search products by multiple criteria
    const products = await Product.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { category: { $in: categoryIds } },
        { tags: { $in: tagIds } },
        { store: { $in: storeIds } },
      ],
    })
      .populate("category")
      .populate("tags")
      .populate("store");

    if (!products.length) {
      return res.status(404).json({ message: "No products found" });
    }

    res.status(200).json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
// Update Product Status
export const updateProductStatus = async (req, res) => {
  try {
    const { status } = req.body; // "active" or "inactive"
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.status(200).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
