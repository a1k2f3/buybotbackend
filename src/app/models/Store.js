import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const storeSchema = new mongoose.Schema(
  {
    // Basic Store Info
    name: { type: String, required: true, trim: true, unique: true },
    ownerName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false }, // Hidden by default
    contactNumber: { type: String, required: true },

    // Store Logo - Now with public_id for deletion
    logo: {
      url: { type: String },
      public_id: { type: String },
    },

    description: { type: String, trim: true },

    // Location
    address: { type: String, required: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, default: "Pakistan" },
    postalCode: { type: String },

    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
    },

    // Verification Status
    isVerified: { type: Boolean, default: false },
    verificationStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },

    // Documents - Now with public_id for future deletion
    documents: {
      cnicFront: {
        url: { type: String },
        public_id: { type: String },
      },
      cnicBack: {
        url: { type: String },
        public_id: { type: String },
      },
      businessLicense: {
        url: { type: String },
        public_id: { type: String },
      },
      taxCertificate: {
        url: { type: String },
        public_id: { type: String },
      },
      otherDocs: [
        {
          url: { type: String, required: true },
          public_id: { type: String, required: true },
          name: { type: String }, // optional: original filename
        },
      ],
    },

    // Store Status
    status: {
      type: String,
      enum: ["Active", "Inactive", "Suspended"],
      default: "Inactive",
    },

    // Relations
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],

    // Ratings
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },

    // Financial
    walletBalance: { type: Number, default: 0 },
    pendingPayments: { type: Number, default: 0 },

    // Social Links
    socialLinks: {
      facebook: { type: String, trim: true },
      instagram: { type: String, trim: true },
      website: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

// Indexes for performance
storeSchema.index({ email: 1 });
storeSchema.index({ name: "text", ownerName: "text" });
storeSchema.index({ "location.coordinates": "2dsphere" }); // For geo queries
storeSchema.index({ verificationStatus: 1 });
storeSchema.index({ status: 1 });

// Password hashing middleware
storeSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to compare password
storeSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Optional: Virtual to get full logo URL with fallback
storeSchema.virtual("logoUrl").get(function () {
  return this.logo?.url || "/default-store-logo.png";
});

export default mongoose.model("Store", storeSchema);