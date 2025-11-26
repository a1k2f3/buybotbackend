// config/cloudinary.js
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Optional: Verify configuration (safe logging — no secrets exposed)
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error("Missing Cloudinary environment variables!");
  process.exit(1); // Stop the app if config is incomplete
} else {
  console.log("Cloudinary configured successfully for:", process.env.CLOUDINARY_CLOUD_NAME);
}

// Optional: Test connection (highly recommended in development)
if (process.env.NODE_ENV !== "production") {
  cloudinary.api
    .ping()
    .then(() => console.log("Cloudinary connection test: SUCCESS"))
    .catch((err) => {
      console.error("Cloudinary connection test: FAILED", err.message);
    });
}

export default cloudinary;