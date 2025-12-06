import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../Config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "stores",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "svg", "pdf"], // Added "pdf" since your docs may include PDFs
    transformation: [
      { width: 500, height: 500, crop: "limit" },
      { quality: "auto", fetch_format: "auto" },
    ],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB max per file
});

// Define the expected fields and their max counts
export const uploadStoreFiles = upload.fields([
  { name: "logo", maxCount: 1 },
  { name: "cnicFront", maxCount: 1 },
  { name: "cnicBack", maxCount: 1 },
  { name: "businessLicense", maxCount: 1 },
  { name: "taxCertificate", maxCount: 1 },
  { name: "otherDocs", maxCount: 10 } // Adjust maxCount as needed for multiples
]);