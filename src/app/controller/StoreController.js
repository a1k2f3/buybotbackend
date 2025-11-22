import Store from "../models/Store.js";
import jwt from "jsonwebtoken";
// Helper function to create token
const generateToken = (id) => {
  return jwt.sign({ id }, "secretkey", { expiresIn: "7d" }); // replace "secretkey" with env variable in production
};

export const submitStoreRequest = async (req, res) => {
  try {
    const {
      name, ownerName, email, password,
      description, address, contactNumber,
      logo, city, state, postalCode, country,
      socialLinks, certificates, documents
    } = req.body;

    const existingRequest = await Store.findOne({ email });
    if (existingRequest)
      return res.status(400).json({ message: "Request already submitted" });

    const request = await Store.create({
      name, ownerName, email, password,
      description, address, contactNumber,
      logo, city, state, postalCode, country,
      socialLinks, certificates, documents
    });

    // TODO: Send email to admin for review

    res.status(201).json({
      message: "Store registration request submitted successfully",
      requestId: request._id
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
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
