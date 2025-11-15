import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  currency: { type: String, default: "Rs" },
  stock: { type: Number, required: true },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  sku: { type: String, unique: true },
  images: [{ type: String }],
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: "Store" },
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tag" }],
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }]
}, { timestamps: true });

export default mongoose.model("Product", productSchema);
