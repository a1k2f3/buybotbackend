import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import Store from "../models/Store.js";

// 🧾 Create a new order from user's cart
export const createOrder = async (req, res) => {
  try {
   const userId = req.query.userId 
   ;
    const { shippingAddress, paymentMethod } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Check for any items where population failed
    const invalidItems = cart.items.filter(item => !item.productId);
    if (invalidItems.length > 0) {
      return res.status(500).json({ message: "Some cart items have invalid or missing product data" });
    }

    const orderItems = cart.items.map((item) => ({
      productId: item.productId._id,
      storeId: item.storeId,
      quantity: item.quantity,
      price: item.productId.price,
    }));

    const totalAmount = orderItems.reduce(
      (acc, item) => acc + item.quantity * item.price,
      0
    );

    const newOrder = new Order({
      userId,
      items: orderItems,
      totalAmount,
      shippingAddress,
      paymentMethod,
    });

    await newOrder.save();

    // clear user cart after placing order
    cart.items = [];
    cart.totalPrice = 0;
    await cart.save();

    res.status(201).json({ message: "Order placed successfully", order: newOrder });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// 📦 Get all orders for a user
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.query.userId;

    const orders = await Order.find({ userId }).populate('items.storeId','name address city contactNumber' )
      

    res.json(orders);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// 🧍‍♂️ Admin - Get all orders
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("userId", "name email phone") // 🧑 user info
      .populate("storeId", "storeName address phone") // 🏬 store info (address included)
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// 🚚 Update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.status = status;
    await order.save();

    res.json({ message: "Order status updated", order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ❌ Cancel an order
export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({
      _id: orderId,
      userId: req.user.id,
    });

    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status !== "Pending")
      return res.status(400).json({ message: "Order cannot be cancelled now" });

    order.status = "Cancelled";
    await order.save();

    res.json({ message: "Order cancelled successfully", order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
