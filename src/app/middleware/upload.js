// middleware/upload.js
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../Config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "products",           // Folder in Cloudinary
    allowed_formats: ["jpg", "jpeg", "png", "webp", "avif", "jfif"],
    transformation: [
      { width: 1000, height: 1000, crop: "limit" },
      { quality: "auto", fetch_format: "auto" }
    ],
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit per image
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp|avif|jfif/;
    const extname = filetypes.test(file.originalname.toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed!"));
  },
});

export const uploadProductImages = upload.array("images", 10); // Max 10 images