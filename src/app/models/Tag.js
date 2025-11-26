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
      default: "#6366f1",
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

// CRITICAL FIX 1: Handle bulk insertMany() properly
tagSchema.pre("save", async function (next) {
  if (this.isModified("name") || !this.slug) {
    const baseSlug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Prevent duplicate slugs in bulk insert
    if (mongoose.isInBulkOperation(this)) {
      let slug = baseSlug;
      let counter = 1;
      while (await this.constructor.countDocuments({ slug })) {
        slug = `${baseSlug}-${counter++}`;
      }
      this.slug = slug;
    } else {
      this.slug = baseSlug;
    }
  }
  next();
});

// Alternative (Recommended for insertMany): Use pre-insertMany hook
tagSchema.pre("insertMany", async function (next, docs) {
  const slugSet = new Set();
  const nameToSlug = {};
  for (const doc of docs) {
    if (!doc.name) continue;
    let baseSlug = doc.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Ensure unique slug even in bulk
    let slug = baseSlug;
    let counter = 1;
    while (slugSet.has(slug) || (await this.countDocuments({ slug }))) {
      slug = `${baseSlug}-${counter++}`;
    }

    doc.slug = slug;
    slugSet.add(slug);
    nameToSlug[doc.name] = slug;
  }

  next();
});

// Virtuals (unchanged - perfect)
tagSchema.virtual("products", {
  ref: "Product",
  localField: "_id",
  foreignField: "tags",
  justOne: false,
});

tagSchema.virtual("productCount", {
  ref: "Product",
  localField: "_id",
  foreignField: "tags",
  count: true,
});

// Indexes (perfect)
tagSchema.index({ slug: 1 });
tagSchema.index({ name: 1 });
tagSchema.index({ isActive: 1 });

const Tag = mongoose.model("Tag", tagSchema);

export default Tag;