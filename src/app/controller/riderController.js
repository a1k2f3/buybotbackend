import Rider from "../models/Rider.js";
import Order from "../models/Order.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
// 🧾 Rider Registration
export const registerRider = async (req, res) => {
  try {
    const { name, phone, email, password, vehicleType } = req.body;

    const existing = await Rider.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);

    const rider = await Rider.create({
      name,
      phone,
      email,
      password: hashed,
      vehicleType,
    });

    res.status(201).json({ message: "Rider registered successfully", rider });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔑 Rider Login
export const loginRider = async (req, res) => {
  try {
    const { email, password } = req.body;

    const rider = await Rider.findOne({ email });
    if (!rider) return res.status(404).json({ message: "Rider not found" });

    const valid = await bcrypt.compare(password, rider.password);
    if (!valid) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: rider._id, role: "rider" }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    res.json({ message: "Login successful", token, rider });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🆕 Get New Orders (unassigned)
export const getNewOrders = async (req, res) => {
  try {
    const orders = await Order.find({ status: "Pending" }).populate("userId", "name phone").
    populate("storeId", "storeName address phone");
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Accept Order
export const acceptOrder = async (req, res) => {
  try {
    const riderId = req.rider.id;
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status !== "Pending")
      return res.status(400).json({ message: "Order already accepted or processed" });

    order.status = "Processing";
    order.assignedRider = riderId;
    await order.save();

    await Rider.findByIdAndUpdate(riderId, {
      currentOrder: orderId,
      isAvailable: false,
    });

    res.json({ message: "Order accepted successfully", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 📍 Get Order Location
export const getOrderLocation = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId).populate("userId", "name phone");
    if (!order) return res.status(404).json({ message: "Order not found" });

    res.json({
      shippingAddress: order.shippingAddress,
      customer: order.userId,
      status: order.status,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🚚 Update Delivery Status
export const updateDeliveryStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body; // e.g. Picked Up, Delivered
    const validStatuses = ["Picked Up", "Delivered"];

    if (!validStatuses.includes(status))
      return res.status(400).json({ message: "Invalid status" });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.status = status;
    await order.save();

    // if delivered → rider becomes available
    if (status === "Delivered") {
      await Rider.findOneAndUpdate(
        { _id: req.rider.id },
        { isAvailable: true, currentOrder: null }
      );
    }

    res.json({ message: "Delivery status updated", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🧾 Get All Orders Assigned to Rider
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ assignedRider: req.rider.id }).sort({
      createdAt: -1,
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
