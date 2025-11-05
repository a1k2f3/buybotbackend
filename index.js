import express from "express";
import connectDB from "./src/app/connection/db.js"; // import connection
import productRoutes from "./src/app/route/ProductRoute.js";
import categoryRoutes from "./src/app/route/CategoryController.js";
import StoreRoute from "./src/app/route/StoreRoute.js";
import tagRoutes from "./src/app/route/tagRoute.js";
import reviewRoutes from "./src/app/route/ReviewRoute.js";
import dotenv from "dotenv";
const app = express();
app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
app.use("/api/categories", categoryRoutes);
app.use("/api/store", StoreRoute);
app.use("/api/tags", tagRoutes);
app.use("/api/reviews", reviewRoutes);

app.use("/api/products", productRoutes);

// const PORT = 5000;
app.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`));
