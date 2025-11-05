import express from "express";
import connectDB from "./src/app/connection/db.js"; // import connection
import productRoutes from "./src/app/route/ProductRoute.js";

const app = express();
app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
app.use("/api/products", productRoutes);

// const PORT = 5000;
app.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`));
