import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema({
  name: String,
  slug: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  // new fields for auto response
  autoResponseEnabled: { type: Boolean, default: false },
  autoResponse: { type: String, default: "" }
});

export const Vendor = mongoose.model("Vendor", vendorSchema);
