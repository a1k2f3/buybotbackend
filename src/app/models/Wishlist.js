// models/Wishlist.js
import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One wishlist per user
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

// Ensure a user has only one wishlist
wishlistSchema.index({ user: 1 }, { unique: true });

// Compound index for faster queries
wishlistSchema.index({ "products.product": 1 });

export default mongoose.models.Wishlist || mongoose.model("Wishlist", wishlistSchema);