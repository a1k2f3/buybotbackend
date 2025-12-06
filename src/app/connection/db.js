// db/connectDB.js
import mongoose from "mongoose";

const connectDB = async () => {
  // If already connected → reuse (prevents timeout on cold start)
  if (mongoose.connections[0].readyState) {
    console.log("Using existing MongoDB connection");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,   // Don't wait forever
      // bufferMaxEntries: 0,               // Disable mongoose buffering
      maxPoolSize: 10,
    });
    console.log()
    console.log("MongoDB Connected Successfully");
  } catch (err) {
    console.error("MongoDB Connection Failed:", err.message);
    // Don't crash the serverless function
    throw err;
  }
};

export default connectDB;