import express from "express";
import { protect } from "../middlewares/auth.js";
import {
    createChat,
    getChats,
    getChatById,
    sendMessage,
    getMessages
} from "../controllers/chatController.js";

const chatRouter = express.Router();

chatRouter.use(protect);

chatRouter.post("/", createChat);
chatRouter.get("/", getChats);
chatRouter.get("/:id", getChatById);
chatRouter.post("/:id/message", sendMessage);
chatRouter.get("/:id/messages", getMessages);

export default chatRouter;
