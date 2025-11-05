import express from "express";
import connectDB from "./src/app/connection/db.js"; // import connection
import productRoutes from "./src/app/route/ProductRoute.js";
import categoryRoutes from "./src/app/route/CategoryController.js";
import StoreRoute from "./src/app/route/StoreRoute.js";
import tagRoutes from "./src/app/route/tagRoute.js";
import reviewRoutes from "./src/app/route/ReviewRoute.js";
import userRoute from "./src/app/route/UserRute.js";
import cartRoute from "./src/app/route/cartRoute.js";
import orderRoutes from "./src/app/route/orderRoutes.js";
import dotenv from "dotenv";
import cors from "cors";
dotenv.config();
const app = express();
app.use(cors('*'));
app.use(express.json());
connectDB();
app.use("/api/categories", categoryRoutes);
app.use("/api/store", StoreRoute);
app.use("/api/tags", tagRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/users", userRoute);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoute);
app.use("/api/orders", orderRoutes);

// const PORT = 5000;
app.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`));
