import express from "express";
import {
  // registerStore,
  approveStoreRequest,  rejectStoreRequest,

  loginStore,
  getStoreProfile,
  updateStore,
  deleteStore,
  submitStoreRequest
} from "../controller/StoreController.js";
import { protect } from "../middleware/authstore.js";

const router = express.Router();
router.post("/send-request",submitStoreRequest );
router.post("/register",approveStoreRequest );
router.post("/reject-request",rejectStoreRequest );
router.post("/login", loginStore);
router.get("/profile", protect, getStoreProfile);
router.put("/:id", protect, updateStore);
router.delete("/:id", protect, deleteStore);

export default router;
