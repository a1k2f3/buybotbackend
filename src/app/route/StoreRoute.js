import express from "express";
import {
  // registerStore,
  approveStoreRequest,  
  rejectStoreRequest,
  loginStore,
  getStoreProfile,
  updateStore,
  deleteStore,
  submitStoreRequest,
  getActiveStores
  ,getAllStoreRequests,
 
} from "../controller/StoreController.js";
import { protect } from "../middleware/authstore.js";
import { uploadStoreFiles, } from "../middleware/uploadstoredocs.js";

const router = express.Router();
/**
 * @swagger
 * api/stores/send-request:
 *   post:
 *     summary: Submit a store registration request
 *     description: Creates a new store request with owner details, documents, and files. Requires multipart/form-data for file uploads.
 *     tags: [Stores]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, ownerName, email, password, address, contactNumber]  # Mark required fields explicitly
 *             properties:
 *               name:
 *                 type: string
 *                 description: Store name
 *               ownerName:
 *                 type: string
 *                 description: Owner's name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Owner's email address
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Account password (hashed on server)
 *               description:
 *                 type: string
 *                 description: Store description
 *               address:
 *                 type: string
 *                 description: Street address
 *               contactNumber:
 *                 type: string
 *                 description: Contact phone number
 *               city:
 *                 type: string
 *                 description: City
 *               state:
 *                 type: string
 *                 description: State/Province
 *               postalCode:
 *                 type: string
 *                 description: Postal/ZIP code
 *               country:
 *                 type: string
 *                 default: "Pakistan"
 *                 description: Country (defaults to Pakistan)
 *               facebook:
 *                 type: string
 *                 description: Facebook link
 *               instagram:
 *                 type: string
 *                 description: Instagram link
 *               website:
 *                 type: string
 *                 description: Website URL
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: Store logo image (e.g., JPG/PNG)
 *               cnicFront:
 *                 type: string
 *                 format: binary
 *                 description: CNIC front image
 *               cnicBack:
 *                 type: string
 *                 format: binary
 *                 description: CNIC back image
 *               businessLicense:
 *                 type: string
 *                 format: binary
 *                 description: Business license document (e.g., PDF/image)
 *               taxCertificate:
 *                 type: string
 *                 format: binary
 *                 description: Tax certificate document (e.g., PDF/image)
 *               otherDocs:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Additional documents (multiple files allowed)
 *     responses:
 *       201:
 *         description: Store request submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Store registration request submitted successfully!"
 *                 requestId:
 *                   type: string
 *                   example: "658b1234567890abcdef1234"
 *                 storeName:
 *                   type: string
 *                   example: "My Store"
 *       400:
 *         description: Bad request (e.g., duplicate email or missing fields)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "A store request with this email already exists."
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Failed to submit request"
 *                 error:
 *                   type: string
 *                   example: "Internal server error details"
 */
router.post("/send-request", uploadStoreFiles, submitStoreRequest);
// router.post("/send-request",uploadStoreImage,submitStoreRequest);
router.get("/active-stores",getActiveStores );
router.get("/store-requests",getAllStoreRequests );
router.post("/register/:id",approveStoreRequest );
router.post("/reject-request",rejectStoreRequest );
router.post("/login", loginStore);
// router.get("/profile", protect, getStoreProfile);
router.get("/profile", getStoreProfile);
router.put("/:id", protect, updateStore);
// router.get("/active-storesproduct",getProductsByStore );  
router.delete("/:id", protect, deleteStore);
export default router ;