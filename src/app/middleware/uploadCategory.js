// middleware/uploadCategory.js
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../Config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "categories",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "svg"],
    transformation: [
      { width: 500, height: 500, crop: "limit" },
      { quality: "auto", fetch_format: "auto" },
    ],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB max
});

export const uploadCategoryImage = upload.single("image"); // Field name: "image"