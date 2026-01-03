import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import Store from "../models/Store.js";

// 🧾 Create a new order from user's cart
export const createOrder = async (req, res) => {
  try {
    const userId = req.query.userId;
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
      size: item.size,
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
      size: orderItems.size
    });

    await newOrder.save();

    // === NEW: Add the order ID to each relevant store ===
    // Collect unique storeIds from the order items
    const storeIds = [...new Set(orderItems.map(item => item.storeId))];

    // Update all stores: push the new order _id into their orders array
    await Store.updateMany(
      { _id: { $in: storeIds } },
      { $push: { orders: newOrder._id } }
    );
    // ====================================================

    // Clear user cart after placing order
    cart.items = [];
    cart.totalPrice = 0;
    await cart.save();

    res.status(201).json({ 
      message: "Order placed successfully", 
      order: newOrder 
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: error.message });
  }
};
// 📦 Get all orders for a user
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.query.userId;

    const orders = await Order.find({ userId }).populate('items.storeId','name address city contactNumber' ).populate("items.productId","name price images description ").sort({ createdAt: -1 });
  
    res.json(orders);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// 🧍‍♂️ Admin - Get all orders
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("userId", "name email phone") // 🧑 Works fine (top-level)
      .populate("items.storeId", "name address contactNumber").populate("items.productId","name price thumbnail description ").sort({ createdAt: -1 }); // 🏬 Correct path for nested storeId
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const getOrdersByStoreId = async (req, res) => {
  try {
    const { storeId } = req.query; // or req.query.storeId if you prefer query param

    if (!storeId) {
      return res.status(400).json({ message: "Store ID is required" });
    }

    // Find orders that have at least one item with the matching storeId
    const orders = await Order.find({
      "items.storeId": storeId,
    })
      .populate({
        path: "items.productId",
        select: "name price images", // populate only needed product fields
      })
      .populate("userId", "name email phone") // optional: populate user info
      .sort({ createdAt: -1 }); // newest first

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "No orders found for this store" });
    }

    // Optional: Filter items in each order to only show items belonging to this store
    // Useful if you don't want to send items from other stores
    const filteredOrders = orders.map(order => {
      const storeItems = order.items.filter(item => item.storeId.toString() === storeId);

      return {
        ...order.toObject(),
        items: storeItems,
        // Recalculate total for this store only (optional)
        storeTotal: storeItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      };
    });

    res.status(200).json({
      message: "Orders retrieved successfully",
      count: filteredOrders.length,
      orders: filteredOrders,
    });
  } catch (error) {
    console.error("Error fetching orders by store:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
export const getOrderDetailById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const {storeId} = req.query; // Assuming you have auth middleware that sets req.storeId from token/localStorage

    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    if (!storeId) {
      return res.status(401).json({ message: "Unauthorized: Store not authenticated" });
    }

    // Find the order and ensure it has at least one item from this store
    const order = await Order.findOne({
      _id: orderId,
      "items.storeId": storeId,
    })
      .populate({
        path: "items.productId",
        select: "name price images description", // populate product details
      })
      .populate("userId", "name email phone");

    if (!order) {
      return res.status(404).json({
        message: "Order not found or does not belong to your store",
      });
    }

    // Filter items to only show those belonging to this store
    const storeItems = order.items.filter(
      (item) => item.storeId.toString() === storeId.toString()
    );

    // Calculate store-specific total
    const storeTotal = storeItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Prepare clean response
    const orderDetail = {
      _id: order._id,
      orderId: order._id.toString(),
      customer: {
        name: order.userId?.name || "N/A",
        email: order.userId?.email || "N/A",
        phone: order.userId?.phone || "N/A",
      },
      shippingAddress: order.shippingAddress,
      items: storeItems.map((item) => ({
        _id: item._id,
        product: item.productId
          ? {
              _id: item.productId._id,
              name: item.productId.name,
              price: item.productId.price,
              images: item.productId.images,
              description: item.productId.description || "",
            }
          : null, // in case product was deleted
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
      })),
      storeTotal,
      overallOrderTotal: order.totalAmount,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };

    res.status(200).json({
      message: "Order details retrieved successfully",
      order: orderDetail,
    });
  } catch (error) {
    console.error("Error fetching order detail:", error);
    res.status(500).json({ message: "Server error", error: error.message });
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
      _id: orderId
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
