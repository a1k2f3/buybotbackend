import Product from "../models/Product.js";
import Wishlist from "../models/Wishlist.js";
// GET user's wishlist
export const getWishlist = async (req, res) => {
  try {
    const userId = req.query.id;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const wishlist = await Wishlist.findOne({ user: userId }).populate(
      "products.product",
      "name price discountPrice thumbnail images stock status"
    );

    if (!wishlist) {
      return res.json({ products: [], total: 0 });
    }

    const validProducts = wishlist.products.filter(
      (item) => item.product && item.product.status === "active" && item.product.stock > 0
    );

    res.json({
      products: validProducts.map((item) => ({
        _id: item.product._id,
        name: item.product.name,
        price: item.product.price,
        discountPrice: item.product.discountPrice,
        thumbnail: item.product.thumbnail || item.product.images?.[0]?.url,
        stock: item.product.stock,
        addedAt: item.addedAt,
      })),
      total: validProducts.length,
    });
  } catch (error) {
    console.error("Get Wishlist Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ADD to wishlist
export const addToWishlist = async (req, res) => {
  try {
    const productId = req.params.productId;
    const userId = req.query.id;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const product = await Product.findById(productId);
    if (!product || product.status !== "active") {
      return res.status(404).json({ message: "Product not found or unavailable" });
    }

    let wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      wishlist = new Wishlist({ user: userId, products: [] });
    }

    const exists = wishlist.products.some(
      (item) => item.product.toString() === productId
    );

    if (exists) {
      return res.status(400).json({ message: "Product already in wishlist" });
    }

    wishlist.products.push({ product: productId });
    await wishlist.save();

    await wishlist.populate("products.product", "name price discountPrice thumbnail images");

    res.status(201).json({
      message: "Product added to wishlist",
      wishlist,
    });
  } catch (error) {
    console.error("Add to Wishlist Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// REMOVE from wishlist
export const removeFromWishlist = async (req, res) => {
  try {
    const productId = req.params.productId;
    const userId = req.query.id;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }

    const initialLength = wishlist.products.length;
    wishlist.products = wishlist.products.filter(
      (item) => item.product.toString() !== productId
    );

    if (wishlist.products.length === initialLength) {
      return res.status(404).json({ message: "Product not in wishlist" });
    }

    await wishlist.save();
    res.json({ message: "Product removed from wishlist" });
  } catch (error) {
    console.error("Remove from Wishlist Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// TOGGLE wishlist
export const toggleWishlist = async (req, res) => {
  try {
    const productId = req.params.productId;
    const userId = req.query.id;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const product = await Product.findById(productId);
    if (!product || product.status !== "active") {
      return res.status(404).json({ message: "Product not found or unavailable" });
    }

    let wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      wishlist = new Wishlist({ user: userId, products: [] });
    }

    const productIndex = wishlist.products.findIndex(
      (item) => item.product.toString() === productId
    );

    if (productIndex > -1) {
      wishlist.products.splice(productIndex, 1);
      await wishlist.save();
      return res.json({ message: "Removed from wishlist", inWishlist: false });
    } else {
      wishlist.products.push({ product: productId });
      await wishlist.save();
      return res.json({ message: "Added to wishlist", inWishlist: true });
    }
  } catch (error) {
    console.error("Toggle Wishlist Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};