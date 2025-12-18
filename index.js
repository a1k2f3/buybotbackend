import express from "express";
import"./src/app/Config/cloudinary.js"; 
import dotenv from "dotenv";
dotenv.config();
import connectDB from "./src/app/connection/db.js"; // import connection
import productRoutes from "./src/app/route/ProductRoute.js";
import categoryRoutes from "./src/app/route/CategoryRoute.js";
import StoreRoute from "./src/app/route/StoreRoute.js";
import tagRoutes from "./src/app/route/tagRoute.js";
import reviewRoutes from "./src/app/route/ReviewRoute.js";
import userRoute from "./src/app/route/UserRute.js";
import cartRoute from "./src/app/route/cartRoute.js";
import orderRoutes from "./src/app/route/orderRoutes.js";
import riderRoutes from "./src/app/route/ReviewRoute.js";
// import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./src/app/Config/swagger.js";

import cors from "cors";
// dotenv.config();
const app = express();
app.use(cors({ origin: "*" }))
app.use(express.json());

app.use(express.urlencoded({ extended: true }));

connectDB();
// app.use(express.json({ limit: "100mb" }));

// CORS
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});
app.get("/", (req, res) => {
  res.json({ message: "E-commerce API Running on Vercel", uptime: process.uptime() });
});
app.use("/api/categories", categoryRoutes);
app.use("/api/store", StoreRoute);
app.use("/api/tags", tagRoutes);
app.use("/api/reviews", reviewRoutes);  
app.use("/api/users", userRoute);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoute);
app.use("/api/orders", orderRoutes);
app.use("/api/riders", riderRoutes);

// const PORT = 5000;
app.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`));
