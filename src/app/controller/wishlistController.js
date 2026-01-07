import Product from "../models/Product.js";
import Wishlist from "../models/WishList.js";

// @desc    Get user's wishlist
// @route   GET /api/wishlist
// @access  Private
export const getWishlist = async (req, res) => {
  try {
    const id=req.query.id;
    const wishlist = await Wishlist.findOne({ user: id }).populate(
      "products.product",
      "name price discountPrice thumbnail images stock status"
    );

    if (!wishlist) {
      return res.json({ products: [] });
    }

    // Filter out inactive/out-of-stock products (optional)
    const validProducts = wishlist.products.filter(
      (item) => item.product && item.product.status === "active" && item.product.stock > 0
    );

    res.json({
      products: validProducts.map((item) => ({
        _id: item.product._id,
        name: item.product.name,
        price: item.product.price,
        discountPrice: item.product.discountPrice,
        thumbnail: item.product.thumbnail || item.product.images[0]?.url,
        stock: item.product.stock,
        addedAt: item.addedAt,
      })),
      total: validProducts.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// controllers/wishlistController.js

export const addToWishlist = async (req, res) => {
  try {
    const productId = req.params.productId;
    const userId = req.user._id; // ← From protect middleware (JWT)

    // ... rest of your code remains SAME
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
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};
// @desc    Remove product from wishlist
// @route   DELETE /api/wishlist/:productId
// @access  Private
export const removeFromWishlist = async (req, res) => {
  try {
    const productId = req.params.productId;
const id=req.query.id;
    const wishlist = await Wishlist.findOne({ user:id });

    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }

    const initialLength = wishlist.products.length;

    wishlist.products = wishlist.products.filter(
      (item) => item.product.toString() !== productId
    );

    if (wishlist.products.length === initialLength) {
      return res.status(404).json({ message: "Product not found in wishlist" });
    }

    await wishlist.save();

    res.json({ message: "Product removed from wishlist" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Toggle wishlist (add if not exists, remove if exists)
// @route   POST /api/wishlist/toggle/:productId
// @access  Private
export const toggleWishlist = async (req, res) => {
  try {
    const productId = req.params.productId;
const id=req.query.id;
    const product = await Product.findById(productId);
    if (!product || product.status !== "active") {
      return res.status(404).json({ message: "Product not found or unavailable" });
    }

    let wishlist = await Wishlist.findOne({ user: id });
    if (!wishlist) {
      wishlist = new Wishlist({ user: id, products: [] });
    }
    const productIndex = wishlist.products.findIndex(
      (item) => item.product.toString() === productId
    );

    if (productIndex > -1) {
      // Remove
      wishlist.products.splice(productIndex, 1);
      await wishlist.save();
      return res.json({ message: "Removed from wishlist", inWishlist: false });
    } else {
      // Add
      wishlist.products.push({ product: productId });
      await wishlist.save();
      return res.json({ message: "Added to wishlist", inWishlist: true });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};