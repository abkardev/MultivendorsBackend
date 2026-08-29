import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import config from "../services/config.js";
export const generateToken = (id) => {
    return jwt.sign({id}, process.env.JWT_SECRET, {expiresIn: process.env.JWT_EXPIRES || "7d"});
};

export const dbConnect = () => mongoose
.connect(process.env.MONGODB_URI, {
    maxPoolSize: config.database.options.maxPoolSize,
    minPoolSize: config.database.options.minPoolSize,
    serverSelectionTimeoutMS: config.database.options.serverSelectionTimeoutMS,
    socketTimeoutMS: config.database.options.socketTimeoutMS,
})
.then(() => console.log("Database Connected"))
.catch((error)=>{
    console.error("MongoDB Connection Error is:", error)
});

export const sanitizeUser = (user) => {
  const { password, ...safeUser } = user.toObject ? user.toObject() : user;
  return safeUser;
};
