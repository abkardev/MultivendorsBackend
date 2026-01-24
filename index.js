import http from "http";
import dotenv from "dotenv";
import express from "express";
import { Server } from "socket.io";
import connectDB from "./src/config/db.js";
import app from "./src/app.js"; // assumes you export express app from src/app.js or adapt accordingly
import chatRoutes from "./src/routes/chatRoutes.js";
import aiRoutes from "./src/routes/aiRoutes.js";
import { Message } from "./src/models/messageModel.js";
import { Vendor } from "./src/models/vendorModel.js";
import { socketAuth } from "./src/middlewares/socketAuth.js";
import vendorListRoutes from "./src/routes/vendorListRoutes.js";

dotenv.config();

// connect to MongoDB
await connectDB();

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.FRONTEND_ORIGIN || "*" } });

// Apply socket authentication middleware to validate JWT and attach user
io.use(socketAuth);

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // join authenticated user's room
  const authUserId = socket.data?.user?._id?.toString();
  if (authUserId) {
    socket.join(authUserId);
  }

  socket.on("join", ({ userId }) => {
    if (userId && authUserId && userId.toString() === authUserId.toString()) {
      socket.join(userId);
    } else {
      // ignored
    }
  });

  socket.on("chat:send", async (payload) => {
    try {
      const fromId = authUserId;
      const { toVendor, message } = payload;
      if (!fromId || !toVendor || !message) {
        return;
      }

      const msg = await Message.create({ from: fromId, to: toVendor, text: message, type: "user" });
      io.to(toVendor).emit("chat:message", { ...msg.toObject(), type: "user" });

      try {
        const vendor = await Vendor.findById(toVendor);
        if (vendor?.autoResponseEnabled && vendor.autoResponse) {
          const auto = await Message.create({ from: toVendor, to: fromId, text: vendor.autoResponse, type: "vendor" });
          io.to(fromId).emit("chat:message", { ...auto.toObject(), type: "vendor" });
        }
      } catch (err) {
        console.error("Error sending auto response:", err);
      }
    } catch (err) {
      console.error("chat:send error", err);
    }
  });
});

// Mount new routes
app.use("/api/chat", chatRoutes);
app.use("/api/ai", aiRoutes);
// Add vendor list route (public) -> full path: /api/vendor/list
app.use("/api/vendor", vendorListRoutes);

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
