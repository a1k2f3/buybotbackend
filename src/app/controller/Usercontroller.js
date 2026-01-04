import User from "../models/User.js";
import Store from "../models/Store.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
// import asyncHandler from "express-async-handler";
// const JWT_SECRET = "your_jwt_secret_key"; // You can move this to .env
import { generateAccessToken, generateRefreshToken } from "../utils/generateToken.js";

// 🧩 Register
export const registerUser = async (req, res) => {
  try {
    const { name, email, phone, password, address } = req.body;

    // Validation
    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled",
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      password, // Will be hashed by pre-save middleware
      addresses: address ? [address] : [], // Use array as per previous schema
    });

    // Generate tokens
    const accessToken = generateAccessToken(user._id, user.role || "customer");
    const refreshToken = generateRefreshToken(user._id, user.role || "customer");

    // Save refresh token to user (for revocation & security)
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // Set refresh token in httpOnly cookie (secure, not accessible via JS)
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Send response
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      accessToken, // Short-lived
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role || "customer",
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// 🧩 Login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id, user.role);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
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
    const { name, phone, addresses, role } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.addresses = addresses || user.addresses;
    user.role = role || user.role;

    await user.save();
    res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
export const addAddress = async (req, res) => {
  const { type, street, apartment, city, state, postalCode, country, isDefault } =
    req.body;
  const id = req.params.id;
  const user = await User.findById(id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const newAddress = {
    type: type || "home",
    street,
    apartment,
    city,
    state,
    postalCode,
    country: country || "United States",
    isDefault: isDefault || false,
  };

  // If this is set as default, unset others
  if (isDefault) {
    user.addresses.forEach((addr) => (addr.isDefault = false));
  }

  // If no addresses yet and not explicitly set as default, make this one default
  if (user.addresses.length === 0 && !isDefault) {
    newAddress.isDefault = true;
  }

  user.addresses.push(newAddress);
  await user.save();

  res.status(201).json({
    success: true,
    message: "Address added successfully",
    address: newAddress,
  });
}

// @desc    Get all addresses of the logged-in user
// @route   GET /api/addresses
// @access  Private
export const getAddresses = async (req, res) => {
  const id = req.params.id;
  const user = await User.findById(id).select("addresses");

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.json({
    success: true,
    addresses: user.addresses,
  });
}
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
