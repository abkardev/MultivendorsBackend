import expressAsyncHandler from "express-async-handler";
import mongoose from "mongoose";
import User from "../models/userModel.js";
import { Chat } from "../models/chatModel.js";
import { Message } from "../models/messageModel.js";
import { AppError } from "../middlewares/errorHandler.js";

function validId(value) {
    return value && mongoose.Types.ObjectId.isValid(value) ? value : undefined;
}

// @desc Create or get existing chat between two users
// @route POST /api/chat
// @access Private (Buyer-Vendor only)
export const createChat = expressAsyncHandler(async (req, res) => {
    const { participantId, vendorId, announcementId } = req.body;
    const userId = req.user._id;
    const safeVendorId = validId(vendorId);
    const safeAnnouncementId = validId(announcementId);

    if (!participantId || !mongoose.Types.ObjectId.isValid(participantId)) {
        throw new AppError("Invalid participant ID", 400);
    }

    // Prevent self-chat
    if (participantId === userId.toString()) {
        throw new AppError("Cannot chat with yourself", 400);
    }

    // Ensure only Buyer-Vendor chats
    const participant = await User.findById(participantId).select("role");
    if (!participant) throw new AppError("Participant not found", 404);
    if (req.user.role === participant.role) {
        throw new AppError("Chat is only allowed between buyers and vendors", 400);
    }
    if (!["user", "vendor"].includes(req.user.role) || !["user", "vendor"].includes(participant.role)) {
        throw new AppError("Invalid participant role", 400);
    }

    // Check if chat already exists
    let chat = await Chat.findOne({
        participants: { $all: [userId, participantId] },
        ...(safeVendorId && { vendor: safeVendorId }),
        ...(safeAnnouncementId && { announcement: safeAnnouncementId })
    });

    if (!chat) {
        chat = await Chat.create({
            participants: [userId, participantId],
            vendor: safeVendorId,
            announcement: safeAnnouncementId
        });
    }

    await chat.populate([
        { path: "participants", select: "name email" },
        { path: "vendor", select: "storeName slug" },
        { path: "lastMessage" }
    ]);

    res.status(201).json({ status: true, data: chat });
});

// @desc Get all chats for current user
// @route GET /api/chat
// @access Private
export const getChats = expressAsyncHandler(async (req, res) => {
    const chats = await Chat.find({
        participants: req.user._id,
        isActive: true
    })
    .populate("participants", "name email")
    .populate("vendor", "storeName slug storeImage")
    .populate("lastMessage")
    .sort({ updatedAt: -1 });

    res.status(200).json({ status: true, data: chats });
});

// @desc Get single chat by ID
// @route GET /api/chat/:id
// @access Private
export const getChatById = expressAsyncHandler(async (req, res) => {
    const chat = await Chat.findById(req.params.id)
        .populate("participants", "name email")
        .populate("vendor", "storeName slug");

    if (!chat) {
        throw new AppError("Chat not found", 404);
    }

    // Check if user is participant
    if (!chat.participants.some(p => p._id.toString() === req.user._id.toString())) {
        throw new AppError("Not authorized", 403);
    }

    res.status(200).json({ status: true, data: chat });
});

// @desc Send message in chat
// @route POST /api/chat/:id/message
// @access Private
export const sendMessage = expressAsyncHandler(async (req, res) => {
    const { content, attachments } = req.body;
    const chatId = req.params.id;

    const chat = await Chat.findById(chatId);
    if (!chat) {
        throw new AppError("Chat not found", 404);
    }

    if (!chat.participants.includes(req.user._id)) {
        throw new AppError("Not authorized", 403);
    }

    const message = await Message.create({
        chat: chatId,
        sender: req.user._id,
        content,
        attachments
    });

    // Update last message in chat
    chat.lastMessage = message._id;
    await chat.save();

    await message.populate("sender", "name email");

    res.status(201).json({ status: true, data: message });
});

// @desc Get messages for a chat
// @route GET /api/chat/:id/messages
// @access Private
export const getMessages = expressAsyncHandler(async (req, res) => {
    const { page = 1, limit = 50 } = req.query;
    const chatId = req.params.id;

    const chat = await Chat.findById(chatId);
    if (!chat) {
        throw new AppError("Chat not found", 404);
    }

    if (!chat.participants.includes(req.user._id)) {
        throw new AppError("Not authorized", 403);
    }

    const messages = await Message.find({ chat: chatId })
        .populate("sender", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    // Mark messages as read
    await Message.updateMany(
        { chat: chatId, sender: { $ne: req.user._id }, isRead: false },
        { isRead: true }
    );

    res.status(200).json({ status: true, data: messages.reverse() });
});

