// middleware/upload.js
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../Config/cloudinary.js";

// === Storage for Images ===
const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "products/images",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "avif", "jfif"],
    resource_type: "image",
    transformation: [
      { width: 1200, height: 1200, crop: "limit" }, // Prevent oversized uploads
      { quality: "auto:good", fetch_format: "auto" }, // WebP/AVIF auto
    ],
  },
});

// === Storage for Videos ===
const videoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "products/videos",
    resource_type: "video",
    allowed_formats: ["mp4", "webm", "mov", "avi", "mkv"], // Common video formats
    transformation: [
      { quality: "auto", fetch_format: "auto" },
      { bitrate: "2000k", video_codec: "auto" }, // Good quality with reasonable size
      { width: 1080, crop: "limit" }, // Max 1080p width
    ],
    eager: [ // Generate thumbnails for videos
      { width: 600, height: 600, crop: "pad", format: "jpg" },
    ],
  },
});

// === Multer Instances ===
const uploadImages = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per image
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp|avif|jfif/;
    const extname = filetypes.test(file.originalname.toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only image files (jpg, jpeg, png, webp, avif) are allowed!"));
  },
});

const uploadVideos = multer({
  storage: videoStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB per video (adjust as needed)
  fileFilter: (req, file, cb) => {
    const filetypes = /mp4|webm|mov|avi|mkv/;
    const extname = filetypes.test(file.originalname.toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only video files (mp4, webm, mov, avi, mkv) are allowed!"));
  },
});

// === Combined Upload Middleware for Images + Videos ===
export const uploadProductMedia = multer({
  storage: new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      // Dynamically determine resource_type and folder based on file type
      if (file.mimetype.startsWith("image/")) {
        return {
          folder: "products/images",
          resource_type: "image",
          allowed_formats: ["jpg", "jpeg", "png", "webp", "avif", "jfif"],
          transformation: [
            { width: 1200, height: 1200, crop: "limit" },
            { quality: "auto:good", fetch_format: "auto" },
          ],
        };
      }

      if (file.mimetype.startsWith("video/")) {
        return {
          folder: "products/videos",
          resource_type: "video",
          allowed_formats: ["mp4", "webm", "mov", "avi", "mkv"],
          transformation: [
            { quality: "auto", bitrate: "2000k" },
            { width: 1080, crop: "limit" },
          ],
          eager: [{ width: 600, crop: "pad", format: "jpg" }], // Auto thumbnail
        };
      }

      throw new Error("Unsupported file type");
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 }, // Max 100MB
}).fields([
  { name: "images", maxCount: 10 },   // Up to 10 images
  { name: "videos", maxCount: 3 },    // Up to 3 videos (adjust as needed)
]);

// Optional: Separate exports if you want to use them individually
export const uploadProductImages = uploadImages.array("images", 10);
export const uploadProductVideos = uploadVideos.array("videos", 3);