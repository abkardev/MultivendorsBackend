import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  from: { type: String, required: true }, // userId or vendorId
  to: { type: String, required: true },
  text: { type: String, required: true },
  type: { type: String, enum: ["user", "vendor", "system"], default: "user" },
  createdAt: { type: Date, default: Date.now }
});

export const Message = mongoose.model("Message", messageSchema);
