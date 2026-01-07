// routes/wishlistRoutes.js
import express from "express";

import { protect } from "../middleware/Usermiddleware.js";
import { addToWishlist, removeFromWishlist, toggleWishlist,getWishlist } from "../controller/WishlistController.js";

const router = express.Router();

// All routes below this will require authentication
// router.use(protect);

router.route("/").get(getWishlist);

router.route("/toggle/:productId").post(toggleWishlist);

router.route("/:productId")
  .post(addToWishlist)
  .delete(removeFromWishlist);

export default router;