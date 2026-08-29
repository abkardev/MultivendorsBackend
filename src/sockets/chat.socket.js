import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { Message } from "../models/messageModel.js";
import { Chat } from "../models/chatModel.js";

export const setupChatSocket = (io) => {
    // Authentication middleware for Socket.io
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token || socket.handshake.query?.token;
            if (!token) {
                return next(new Error("Authentication required"));
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select("-password");
            if (!user) {
                return next(new Error("User not found"));
            }
            socket.user = user;
            next();
        } catch (err) {
            next(new Error("Authentication failed"));
        }
    });

    io.on("connection", (socket) => {
        console.log("User connected:", socket.user?.email || socket.id);

        // Auto-join user's own chat rooms
        (async () => {
            try {
                const chats = await Chat.find({ participants: socket.user._id }).select("_id");
                chats.forEach(chat => socket.join(chat._id.toString()));
            } catch (_) { /* ignore */ }
        })();

        // Join user's chat rooms
        socket.on("join_chat", async (chatId) => {
            // Verify user is participant
            try {
                const chat = await Chat.findById(chatId);
                if (chat && chat.participants.some(p => p.toString() === socket.user._id.toString())) {
                    socket.join(chatId);
                }
            } catch (_) { /* ignore */ }
        });

        // Leave chat room
        socket.on("leave_chat", (chatId) => {
            socket.leave(chatId);
        });

        // Handle new message
        socket.on("send_message", async (data) => {
            try {
                const { chatId, content, attachments } = data;

                // Verify sender is participant
                const chat = await Chat.findById(chatId);
                if (!chat || !chat.participants.some(p => p.toString() === socket.user._id.toString())) {
                    socket.emit("message_error", { error: "Not authorized" });
                    return;
                }

                // Save message to database
                const message = await Message.create({
                    chat: chatId,
                    sender: socket.user._id,
                    content,
                    attachments
                });

                // Update chat's last message
                await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id });

                // Populate sender info
                await message.populate("sender", "name email");

                // Broadcast to all users in chat room except sender
                socket.to(chatId).emit("receive_message", message);
                // Also send back to sender for confirmation
                socket.emit("message_sent", message);

            } catch (error) {
                socket.emit("message_error", { error: error.message });
            }
        });

        // Typing indicators
        socket.on("typing", (data) => {
            socket.to(data.chatId).emit("user_typing", {
                userId: socket.user._id,
                userName: socket.user.name
            });
        });

        socket.on("stop_typing", (data) => {
            socket.to(data.chatId).emit("user_stop_typing", {
                userId: socket.user._id
            });
        });

        // Mark messages as read
        socket.on("mark_read", async (data) => {
            try {
                const chat = await Chat.findById(data.chatId);
                if (chat && chat.participants.some(p => p.toString() === socket.user._id.toString())) {
                    await Message.updateMany(
                        { chat: data.chatId, sender: { $ne: socket.user._id }, isRead: false },
                        { isRead: true }
                    );
                    socket.to(data.chatId).emit("messages_read", { chatId: data.chatId, userId: socket.user._id });
                }
            } catch (_) { /* ignore */ }
        });

        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.user?.email || socket.id);
        });
    });
};

