import mongoose from "mongoose";

const riderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    vehicleType: { type: String, enum: ["Bike", "Car", "Van"], default: "Bike" },
    isAvailable: { type: Boolean, default: true },
    currentOrder: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Rider", riderSchema);
