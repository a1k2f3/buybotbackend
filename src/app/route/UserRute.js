import express from "express";
import {
  registerUser,
  loginUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../controller/Usercontroller.js";
const router = express.Router();

router.post("/register", registerUser); // Register
router.post("/login", loginUser);       // Login
router.get("/", getAllUsers);           // Get all users
router.get("/:id", getUserById);        // Get user by ID
router.put("/:id", updateUser);         // Update user
router.delete("/:id", deleteUser);      // Delete user

export default router;