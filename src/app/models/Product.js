import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true },
    currency: { type: String, default: "Rs" },
    stock: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["active", "inactive", "draft"],
      default: "draft",
    },
    sku: { type: String, unique: true, sparse: true },
    
    // FIXED: Now accepts objects with url + public_id
    images: [
      {
        url: { type: String, required: true },
        public_id: { type: String, required: true },
      },
    ],

    thumbnail: { type: String }, // Auto-set first image

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
    },
    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tag",
      },
    ],
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Review",
      },
    ],
  },
  { timestamps: true }
);

// Optional: Index for faster queries
productSchema.index({ name: "text", description: "text" });
productSchema.index({ category: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ status: 1 });

export default mongoose.model("Product", productSchema);