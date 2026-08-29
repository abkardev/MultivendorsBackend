import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }],
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor"
    },
    announcement: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Announcement"
    },
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message"
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

chatSchema.index({ participants: 1 });
chatSchema.index({ vendor: 1 });
chatSchema.index({ participants: 1, isActive: 1 });
chatSchema.index({ updatedAt: -1 });

export const Chat = mongoose.model("Chat", chatSchema);
