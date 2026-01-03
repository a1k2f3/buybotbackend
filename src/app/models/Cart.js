import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },

  storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
  size: { type: String },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
});
const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  items: [cartItemSchema],
  totalPrice: {
    type: Number,
    default: 0,
  },
});

export default mongoose.model("Cart", cartSchema);
