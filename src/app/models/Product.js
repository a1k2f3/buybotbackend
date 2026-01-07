  import mongoose from "mongoose";

  const productSchema = new mongoose.Schema(
    {
      name: { type: String, required: true, trim: true },
      description: { type: String, trim: true },
      price: { type: Number, required: true, min: 0 },
      discountPrice: {
    type: Number,
    min: [0, 'Discount price must be non-negative'],
    default: null,
  },
      currency: { type: String, default: "Rs" },
      stock: { type: Number, required: true, min: 0 },
      status: {
        type: String,
        enum: ["active", "inactive", "draft"],
        default: "active",
      },
      sku: { type: String, unique: true, sparse: true },

      // Images: array of objects with url and public_id (e.g., from Cloudinary)
      images: [
        {
          url: { type: String, required: true },
          public_id: { type: String, required: true },
        },
      ],

      thumbnail: { type: String }, // Auto-set to first image.url if needed

      // Videos: similar structure to images
      videos: [
    {
      url: { type: String, required: true },
      public_id: { type: String, required: true },
      thumbnail: { type: String }, // Auto-generated thumbnail URL
    },
  ],

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

      // New fields added
      specifications: {
        type: Map,
        of: String, // Flexible key-value pairs, e.g., { "Material": "Cotton", "Weight": "200g" }
        default: {},
      },

      warranty: {
        type: String,
        trim: true,
        default: null, // e.g., "1 Year Manufacturer Warranty"
      },

      size: [
        {
          type: String,
          trim: true,
          uppercase: true, // Optional: standardize size format
        },
      ], // e.g., ["S", "M", "L", "XL"]

      ageGroup: {
        type: String,
        enum: [
          "Newborn (0-3 months)",
          "Infant (3-12 months)",
          "Toddler (1-3 years)",
          "Kids (4-12 years)",
          "Teen (13-18 years)",
          "Adult",
          "All Ages",
          null,
        ],
        default: null,
      },
    },
    { timestamps: true }
  );

  // Indexes for better query performance
  productSchema.index({ name: "text", description: "text" });
  productSchema.index({ category: 1 });
  productSchema.index({ tags: 1 });
  productSchema.index({ status: 1 });
  productSchema.index({ price: 1 });
  productSchema.index({ discountPrice: 1 });
  productSchema.index({ size: 1 });

  export default mongoose.model("Product", productSchema);