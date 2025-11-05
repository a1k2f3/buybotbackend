import Store from "../models/Store.js";
import jwt from "jsonwebtoken";
// Helper function to create token
const generateToken = (id) => {
  return jwt.sign({ id }, "secretkey", { expiresIn: "7d" }); // replace "secretkey" with env variable in production
};

// ✅ Register Store
export const registerStore = async (req, res) => {
  try {
    const { name, ownerName, email, password, description, address, contactNumber, logo } = req.body;

    const existingStore = await Store.findOne({ email });
    if (existingStore) return res.status(400).json({ message: "Store already registered" });

    const store = await Store.create({
      name,
      ownerName,
      email,
      password,
      description,
      address,
      contactNumber,
      logo
    });

    res.status(201).json({
      _id: store._id,
      name: store.name,
      email: store.email,
      token: generateToken(store._id),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ✅ Store Login
export const loginStore = async (req, res) => {
  try {
    const { email, password } = req.body;
    const store = await Store.findOne({ email });

    if (!store) return res.status(404).json({ message: "Store not found" });

    const isMatch = await store.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: "Invalid password" });

    res.json({
      _id: store._id,
      name: store.name,
      email: store.email,
      token: generateToken(store._id),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Get Store Details (protected)
export const getStoreProfile = async (req, res) => {
  try {
    const store = await Store.findById(req.store.id).populate("products");
    if (!store) return res.status(404).json({ message: "Store not found" });
    res.json(store);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Update Store
export const updateStore = async (req, res) => {
  try {
    const store = await Store.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(store);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ✅ Delete Store
export const deleteStore = async (req, res) => {
  try {
    await Store.findByIdAndDelete(req.params.id);
    res.json({ message: "Store deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
