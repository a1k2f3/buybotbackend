// routes/wishlistRoutes.js  (or wherever it is)

import express from "express";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
} from "../controller/wishlistfinalcontroller";  // ← Note: "controllers" (plural, lowercase 'c')
// import { protect } from "../middleware/authstore.js";
// router.use(protect);
const router = express.Router();

router.route("/").get(getWishlist);
router.route("/toggle/:productId").post(toggleWishlist);
router.route("/:productId").post(addToWishlist).delete(removeFromWishlist);

export default router;