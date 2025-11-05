import express from "express";
import {
  registerStore,
  loginStore,
  getStoreProfile,
  updateStore,
  deleteStore
} from "../controller/StoreController.js";
import { protect } from "../middleware/authstore.js";

const router = express.Router();

router.post("/register", registerStore);
router.post("/login", loginStore);
router.get("/profile", protect, getStoreProfile);
router.put("/:id", protect, updateStore);
router.delete("/:id", protect, deleteStore);

export default router;
