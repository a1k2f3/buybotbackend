import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: "dauhpzant",
  api_key: "826516522458145",
  api_secret: "ZKj_lBJNV6TQ4eiGPfF33geWRFM",
});

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });
// console.log({
//   cloud_name: "dauhpzant",
//   api_key: "826516522458145",
//   api_secret: "ZKj_lBJNV6TQ4eiGPfF33geWRFM",
// });

// console.log("Loaded Cloudinary ENV:", {
//   name: process.env.CLOUDINARY_CLOUD_NAME,
//   key: process.env.CLOUDINARY_API_KEY,
//   secret: process.env.CLOUDINARY_API_SECRET
// });
export default cloudinary;