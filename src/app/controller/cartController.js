import Cart from "../models/Cart.js";
import Store from "../models/Store.js";
import User from "../models/User.js";

// ➕ Add item to cart
import Product from "../models/Product.js";

export const addToCart = async (req, res) => {
  try {
    const userId = req.query.userId;
    const { productId, storeId, quantity } = req.body;

    if (!userId) return res.status(400).json({ message: "User ID is required" });
    if (!productId || !storeId)
      return res.status(400).json({ message: "Product ID & Store ID are required" });

    // Fetch the product and validate storeId
    const product = await Product.findById(productId);
    if (!product || product.brand._id?.toString() !== storeId) {
      return res.status(404).json({ message: "Product not found in this store" });
    }

    // Find or create cart
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [], totalPrice: 0 });
    }

    // Check if item exists
    const existingItem = cart.items.find(
      (item) =>
        item.productId.toString() === productId &&
        item.storeId.toString() === storeId
    );

    if (existingItem) {
      existingItem.quantity += quantity || 1;
    } else {
      cart.items.push({
        productId,
        storeId,
        quantity: quantity || 1,
      });
    }

    // Calculate totalPrice safely
    let total = 0;
    for (let item of cart.items) {
      const itemProduct = await Product.findById(item.productId);
      if (itemProduct) total += item.quantity * itemProduct.price;
    }
    cart.totalPrice = total;

    await cart.save();

    res.status(200).json({ message: "Item added to cart", cart });
  } catch (error) {
    console.error("Add to cart error:", error); // <-- log error for debugging
    res.status(500).json({ message: error.message });
  }
};




// 📜 Get user cart
export const getCart = async (req, res) => {
  try {
     const userId = req.query.userId 
    const cart = await Cart.findOne({ userId: userId }).populate(
      "items.productId",
      "name price images brand",
    );

    if (!cart) return res.status(404).json({ message: "Cart is empty" });
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✏️ Update item quantity
export const updateCartItem = async (req, res) => {
  try {
     const userId = req.query.userId 
    const { productId, quantity } = req.body;
    const cart = await Cart.findOne({ userId:userId  });

    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.find(
      (item) => item.productId.toString() === productId
    );

    if (!item) return res.status(404).json({ message: "Item not in cart" });

    item.quantity = quantity;
    cart.totalPrice = await calculateTotal(cart.items);
    await cart.save();

    res.json({ message: "Cart updated", cart });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ❌ Remove single item
export const removeCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
     const userId = req.query.userId 
    const cart = await Cart.findOne({ userId: userId });

    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(
      (item) => item.productId.toString() !== productId
    );
    cart.totalPrice = await calculateTotal(cart.items);
    await cart.save();

    res.json({ message: "Item removed", cart });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🧹 Clear all items
export const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.id });

    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = [];
    cart.totalPrice = 0;
    await cart.save();

    res.json({ message: "Cart cleared", cart });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🧮 Helper function to calculate total
const calculateTotal = async (items) => {
  let total = 0;
  for (const item of items) {
    const product = await Store.findById(item.productId);
    if (product) total += product.price * item.quantity;
  }
  return total;
};
