import express from "express";
import {
  createTag,
  getAllTags,
  getTagById,
  updateTag,
  deleteTag,
  createManyTags,
  
} from "../controller/tagController.js";

const router = express.Router();

// PUBLIC ROUTES
router.get("/", getAllTags);                    // GET /api/tags
router.get("/:id", getTagById);                 // GET /api/tags/on-sale  (or by ID)

// ADMIN ROUTES (add protect + admin middleware later)
router.post("/creatMultiples", createManyTags);                    // POST /api/tags
router.post("/", createTag);                    // POST /api/tags
router.put("/:id", updateTag);                  // PUT /api/tags/123
router.delete("/:id", deleteTag);               // DELETE /api/tags/123

export default router;