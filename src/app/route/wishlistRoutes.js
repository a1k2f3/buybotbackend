// routes/wishlistRoutes.js
import express from "express";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
} from "../controllers/wishlistController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes below this will require authentication
router.use(protect);

router.route("/").get(getWishlist);

router.route("/toggle/:productId").post(toggleWishlist);

router.route("/:productId")
  .post(addToWishlist)
  .delete(removeFromWishlist);

export default router;