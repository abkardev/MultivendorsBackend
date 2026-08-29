import express from "express";
import { protect, authorize } from "../middlewares/auth.js";
import {
    createAnnouncement,
    getAnnouncements,
    getAnnouncementById,
    getMyAnnouncements,
    respondToAnnouncement,
    updateAnnouncement,
    deleteAnnouncement
} from "../controllers/announcementController.js";

const announcementRouter = express.Router();

// Public routes
announcementRouter.get("/", getAnnouncements);
announcementRouter.get("/:id", getAnnouncementById);

// Protected routes
announcementRouter.use(protect);
announcementRouter.post("/", authorize("user"), createAnnouncement);
announcementRouter.get("/user/my", getMyAnnouncements);
announcementRouter.post("/:id/respond", authorize("vendor"), respondToAnnouncement);
announcementRouter.put("/:id", updateAnnouncement);
announcementRouter.delete("/:id", deleteAnnouncement);

export default announcementRouter;
