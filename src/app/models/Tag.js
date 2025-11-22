import mongoose from "mongoose";

const tagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tag name is required"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [2, "Tag must be at least 2 characters"],
      maxlength: [30, "Tag cannot exceed 30 characters"],
    },
    slug: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, "Description cannot exceed 200 characters"],
    },
    color: {
      type: String,
      default: "#6366f1", // Tailwind indigo-500
      match: [/^#[0-9A-F]{6}$/i, "Invalid hex color format"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-generate slug
tagSchema.pre("save", function (next) {
  if (this.isModified("name") || !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  next();
});

// Virtual: Get all products that have this tag
tagSchema.virtual("products", {
  ref: "Product",                    // Your Product model name
  localField: "_id",
  foreignField: "tags",              // Field in Product that stores tag IDs
  justOne: false,
});

// Virtual: Just get the count (super fast & useful!)
tagSchema.virtual("productCount", {
  ref: "Product",
  localField: "_id",
  foreignField: "tags",
  count: true,
});

// Indexes for speed
tagSchema.index({ slug: 1 });
tagSchema.index({ isActive: 1 });

const Tag = mongoose.model("Tag", tagSchema);

export default Tag;