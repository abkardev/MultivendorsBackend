import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema({
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    title: {
        en: { type: String, required: true },
        ar: String
    },
    description: {
        en: { type: String, required: true },
        ar: String
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category"
    },
    quantity: {
        type: Number,
        required: true
    },
    unit: String,
    budget: {
        min: Number,
        max: Number,
        currency: { type: String, default: "USD" }
    },
    deadline: Date,
    attachments: [String],
    status: {
        type: String,
        enum: ["open", "in_progress", "closed", "expired"],
        default: "open"
    },
    responses: [{
        vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
        message: String,
        quotedPrice: Number,
        respondedAt: { type: Date, default: Date.now }
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

announcementSchema.index({ buyer: 1 });
announcementSchema.index({ status: 1, createdAt: -1 });
announcementSchema.index({ buyer: 1, status: 1 });
announcementSchema.index({ category: 1, status: 1 });
announcementSchema.index({ isActive: 1, status: 1 });
announcementSchema.index({ createdAt: -1 });
announcementSchema.index({ 'title.en': 'text', 'title.ar': 'text', 'description.en': 'text', 'description.ar': 'text' });

export const Announcement = mongoose.model("Announcement", announcementSchema);
