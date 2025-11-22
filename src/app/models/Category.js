import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    image: {
      url: {
        type: String,
        required: [true, "Category image URL is required"],
      },
      public_id: {
        type: String,
      },
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
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

// Generate slug automatically
categorySchema.pre("save", function (next) {
  if (this.isModified("name") || !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  next();
});

// Virtual: Populate all products belonging to this category
categorySchema.virtual("products", {
  ref: "Product",           // Make sure your Product model is named "Product"
  localField: "_id",
  foreignField: "category", // This assumes your Product has a field called "category"
  justOne: false,
});

// Virtual: Subcategories (children)
categorySchema.virtual("subcategories", {
  ref: "Category",
  localField: "_id",
  foreignField: "parentCategory",
});

// Indexes for performance
categorySchema.index({ parentCategory: 1 });
categorySchema.index({ slug: 1 });
categorySchema.index({ isActive: 1 });

// Optional: Add a virtual for total product count (very useful!)
categorySchema.virtual("productCount", {
  ref: "Product",
  localField: "_id",
  foreignField: "category",
  count: true, // This returns only the count
});

const Category = mongoose.model("Category", categorySchema);

export default Category;