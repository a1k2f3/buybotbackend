import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const storeSchema = new mongoose.Schema(
  {
    // 🔹 Basic Store Info
    name: { type: String, required: true, unique: true },
    ownerName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    contactNumber: { type: String, required: true },
    logo: { type: String },
    description: { type: String },

    // 🔹 Location Details
    address: { type: String, required: true },
    city: { type: String },
    state: { type: String },
    country: { type: String, default: "Pakistan" },
    postalCode: { type: String },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
    },

    // 🔹 Verification & Documents
    isVerified: { type: Boolean, default: false },
    verificationStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    // certificates: [
    //   {
    //     name: { type: String }, // e.g., "Business Registration", "Tax Certificate"
    //     fileUrl: { type: String }, // Path or URL to uploaded file
    //     issuedBy: { type: String },
    //     issueDate: { type: Date },
    //   },
    // ],
    documents: {
      cnicFront: { type: String }, // CNIC front image
      cnicBack: { type: String },  // CNIC back image
      businessLicense: { type: String }, // Optional license file
      taxCertificate: { type: String }, // Optional tax document
      otherDocs: [{ type: String }], // For multiple additional files
    },

    // 🔹 Store Status
    status: {
      type: String,
      enum: ["Active", "Inactive", "Suspended"],
      default: "Active",
    },

    // 🔹 Store Activity
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],

    // 🔹 Performance Metrics
    rating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },

    // 🔹 Financial Info
    walletBalance: { type: Number, default: 0 },
    pendingPayments: { type: Number, default: 0 },

    // 🔹 Optional Social Links
    socialLinks: {
      facebook: { type: String },
      instagram: { type: String },
      website: { type: String },
    },
  },
  { timestamps: true }
);

//
// 🔐 Hash password before saving
//
storeSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

//
// 🔍 Compare password method
//
storeSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("Store", storeSchema);
