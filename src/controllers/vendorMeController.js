import expressAsyncHandler from "express-async-handler";
import { Vendor } from "../models/vendorModel.js";

export const getVendorMe = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) return res.status(404).json({ status: false, message: "Vendor not found" });
  res.json({ status: true, data: vendor });
});
