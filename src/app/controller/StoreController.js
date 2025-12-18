import Store from "../models/Store.js";
import jwt from "jsonwebtoken";
 import mongoose from "mongoose";

import cloudinary from "../Config/cloudinary.js";
// Helper function to create token
const generateToken = (id) => {
  return jwt.sign({ id }, "secretkey", { expiresIn: "7d" }); // replace "secretkey" with env variable in production
};

export const submitStoreRequest = async (req, res) => {
  try {
    const {
      name,
      ownerName,
      email,
      password,
      description = "",
      address,
      contactNumber,
      city,
      state,
      postalCode,
      country = "Pakistan",
      facebook = "",
      instagram = "",
      website = "",
    } = req.body;

    // Required fields check
    if (!name || !ownerName || !email || !password || !address || !contactNumber) {
      return res.status(400).json({ message: "Please fill all required fields." });
    }

    // Check if email already used
    const existingStore = await Store.findOne({ email });
    if (existingStore) {
      return res.status(400).json({ message: "A store request with this email already exists." });
    }

    // EXACTLY LIKE YOUR PRODUCT CONTROLLER - NO CLOUDINARY
    const uploadedFiles = req.files || {};

    // Logo
    const logo = uploadedFiles.logo?.[0]
      ? { url: uploadedFiles.logo[0].path, public_id: uploadedFiles.logo[0].filename }
      : null;

    // Documents - same simple pattern as Product
    const documents = {
      cnicFront: uploadedFiles.cnicFront?.[0]
        ? { url: uploadedFiles.cnicFront[0].path, public_id: uploadedFiles.cnicFront[0].filename }
        : null,

      cnicBack: uploadedFiles.cnicBack?.[0]
        ? { url: uploadedFiles.cnicBack[0].path, public_id: uploadedFiles.cnicBack[0].filename }
        : null,

      businessLicense: uploadedFiles.businessLicense?.[0]
        ? { url: uploadedFiles.businessLicense[0].path, public_id: uploadedFiles.businessLicense[0].filename }
        : null,

      taxCertificate: uploadedFiles.taxCertificate?.[0]
        ? { url: uploadedFiles.taxCertificate[0].path, public_id: uploadedFiles.taxCertificate[0].filename }
        : null,

      otherDocs: uploadedFiles.otherDocs?.map(file => ({
        url: file.path,
        public_id: file.filename,
        name: file.originalname,
      })) || [],
    };

    // Create the store request
    const newStore = await Store.create({
      name: name.trim(),
      ownerName: ownerName.trim(),
      email: email.toLowerCase().trim(),
      password, // auto-hashed by your model
      description: description.trim(),
      address: address.trim(),
      contactNumber: contactNumber.trim(),
      city: city?.trim(),
      state: state?.trim(),
      postalCode: postalCode?.trim(),
      country,
      logo, // { url, public_id } - exactly like Product
      socialLinks: {
        facebook: facebook.trim(),
        instagram: instagram.trim(),
        website: website.trim(),
      },
      documents, // exactly like Product.images
      verificationStatus: "Pending",
      status: "Inactive",
    });
   
    return res.status(201).json({
      success: true,
      message: "Store registration request submitted successfully!",
      requestId: newStore._id,
      storeName: newStore.name,
    });

  } catch (error) {
    console.error("Store Request Error:", error);
    return res.status(500).json({ 
      message: "Failed to submit request", 
      error: error.message 
    });
  }
};
export const approveStoreRequest = async (req, res) => {
  try {
    const { id } = req.params;  // ID from body

    if (!id) {
      return res.status(400).json({ message: "ID is required" });
    }

    const request = await Store.findById(id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    // Update the SAME store request → set isVerified + status
    const updatedStore = await Store.findByIdAndUpdate(
      id,
      {
        isVerified: true,
        status: "Active",
        verificationStatus: "Approved"
      },
      { new: true }
    );

    res.json({
      message: "Store approved successfully",
      store: updatedStore
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const getAllStoreRequests = async (req, res) => {
  try {
    const requests = await Store.find({ isVerified: false }); 
    res.json(requests);
  }
  catch (err) {
    res.status(500).json({ error: err.message });
  } 
};

export const rejectStoreRequest = async (req, res) => {
  try {
    const request = await Store.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    request.status = "Rejected";
    await request.save();

    res.json({ message: "Store request rejected" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ✅ Store Login
export const loginStore = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // 2. Find store
    const store = await Store.findOne({ email }).select("+password"); // VERY IMPORTANT!

    // 3. Check if store exists AND password is correct
    if (!store) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Add safety: if password field is missing in DB
    if (!store.password) {
      console.error("Store found but password is missing in DB:", store._id);
      return res.status(500).json({ message: "Account error. Contact support." });
    }

    const isMatch = await store.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 5. Success → send token
    res.status(200).json({
      _id: store._id,
      name: store.name,
      email: store.email,
      token: generateToken(store._id),
    });
  } catch (error) {
    // Now you will SEE the real error in console
    console.error("LOGIN STORE ERROR:", error.message);
    console.error(error.stack);

    res.status(500).json({
      message: "Server error during login",
      // Remove this in production
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
export const getActiveStores = async (req, res) => {  
  try {
    const stores = await Store.find({ status: "Active"});
    res.json(stores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } 
};
// ✅ Get Store Details (protected)
export const getStoreProfile = async (req, res) => {
  try {
    const storeId = req.query.storeId;

    if (!storeId) {
      return res.status(401).json({ message: "Not authorized, no store ID" });
    }

    // ✅ Correct usage of findById
    const store = await Store.findById(storeId)
      .populate("products", "name price images status tags stock sku category");

    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    // Ensure products is always an array
    const products = store.products || [];

    res.json({ ...store.toObject(), products });
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
