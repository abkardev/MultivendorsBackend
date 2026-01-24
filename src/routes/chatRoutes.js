import express from "express";
import { Message } from "../models/messageModel.js";
import { protect } from "../middlewares/authMiddleware.js";
import { Vendor } from "../models/vendorModel.js";

const router = express.Router();

// Get conversation threads for authenticated user
// GET /api/chat/threads/me
// Returns list of threads with last message and optional vendor info.
router.get("/threads/me", protect, async (req, res) => {
  try {
    const userId = req.user._id.toString();

    const messages = await Message.find({
      $or: [{ from: userId }, { to: userId }]
    }).sort({ createdAt: -1 });

    const threadsMap = new Map();
    for (const m of messages) {
      const fromId = m.from.toString();
      const toId = m.to.toString();
      const otherId = fromId === userId ? toId : fromId;
      if (!threadsMap.has(otherId)) {
        threadsMap.set(otherId, { otherId, lastMessage: m });
      }
    }

    const threads = Array.from(threadsMap.values());
    const otherIds = threads.map((t) => t.otherId);
    const vendors = otherIds.length ? await Vendor.find({ _id: { $in: otherIds } }).select("name slug _id") : [];
    const vendorMap = new Map(vendors.map((v) => [v._id.toString(), v]));

    const result = threads.map((t) => ({
      id: t.otherId,
      lastMessage: t.lastMessage,
      vendor: vendorMap.get(t.otherId) || null
    }));

    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
});

// get chat history for the authenticated user (protected)
// GET /api/chat/history/me
router.get("/history/me", protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const messages = await Message.find({
      $or: [{ from: userId.toString() }, { to: userId.toString() }]
    }).sort("createdAt");
    res.json({ status: true, data: messages });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
});

// get chat history for a user (protected) - kept for compatibility
router.get("/history/:userId", protect, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ from: req.params.userId }, { to: req.params.userId }]
    }).sort("createdAt");
    res.json({ status: true, data: messages });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
});

export default router;
