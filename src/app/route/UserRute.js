import express from "express";
import {
  registerUser,
  loginUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  addAddress,
  getAddresses,
} from "../controller/Usercontroller.js";
import { protect } from "../middleware/Usermiddleware.js";

const router = express.Router();

router.post("/register", registerUser); // Register
router.post("/login", loginUser);       // Login
router.get("/", getAllUsers);           // Get all users
router.get("/:id", getUserById);        // Get user by ID
router.put("/:id", updateUser);         // Update user
router.delete("/:id", deleteUser);      // Delete user
router.post("/addresses/:id",addAddress);
router.get("/addresses/:id",getAddresses);
export default router;