import express from "express";
import { Vendor } from "../models/vendorModel.js";

const router = express.Router();

/**
 * GET /api/vendor/list
 * Public: returns an array of vendors with minimal fields useful for selection
 * Example response:
 * { status: true, data: [{ _id, name, slug }, ...] }
 */
router.get("/list", async (req, res) => {
  try {
    const vendors = await Vendor.find().select("name slug _id").lean();
    res.json({ status: true, data: vendors });
  } catch (err) {
    console.error("GET /api/vendor/list error:", err);
    res.status(500).json({ status: false, error: err.message });
  }
});

export default router;
