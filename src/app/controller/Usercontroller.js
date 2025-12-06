import User from "../models/User.js";
import Store from "../models/Store.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// const JWT_SECRET = "your_jwt_secret_key"; // You can move this to .env

// 🔹 Generate JWT
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// 🧩 Register
export const registerUser = async (req, res) => {
  try {
    const { name, email, phone, password, address,} = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: "All required fields must be filled" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already registered" });

    let store = null;
    

    const user = await User.create({
      name,
      email,
      phone,
      password,
      // role,
      address,
      // store: store ? store._id : null,
    });

    if (store) {
      store.owner = user._id;
      await store.save();
    }

    const token = generateToken(user._id, user.role);
    res.status(201).json({
      message: "User registered successfully",
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      token,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// 🧩 Login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      message: "Login successful",
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      token,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// 🧩 Get All Users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().populate("orders", "status totalPrice items");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// 🧩 Get User by ID
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("orders", "status totalPrice items");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// 🧩 Update User
export const updateUser = async (req, res) => {
  try {
    const { name, phone, address, role } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.address = address || user.address;
    user.role = role || user.role;

    await user.save();
    res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// 🧩 Delete User
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await user.deleteOne();
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
