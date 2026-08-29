import expressAsyncHandler from "express-async-handler";
import { Announcement } from "../models/announcementModel.js";
import { Vendor } from "../models/vendorModel.js";
import { AppError } from "../middlewares/errorHandler.js";
import { sanitizeBody } from "../utils/sanitize.js";

const ALLOWED_FIELDS = ['title', 'titleAr', 'description', 'descriptionAr', 'category', 'status', 'isActive', 'tags'];

// @desc Create new announcement/RFQ
// @route POST /api/announcement
// @access Private (Buyer only)
export const createAnnouncement = expressAsyncHandler(async (req, res) => {
    const announcement = await Announcement.create({
        ...sanitizeBody(req.body, ALLOWED_FIELDS),
        buyer: req.user._id
    });

    res.status(201).json({ status: true, data: announcement });
});

// @desc Get all active announcements (for vendors)
// @route GET /api/announcement
// @access Public
export const getAnnouncements = expressAsyncHandler(async (req, res) => {
    const { category, status = "open", page = 1, limit = 20 } = req.query;

    const query = { isActive: true };
    if (status) query.status = status;
    if (category) query.category = category;

    const announcements = await Announcement.find(query)
        .populate("buyer", "name")
        .populate("category", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await Announcement.countDocuments(query);

    res.status(200).json({
        status: true,
        data: announcements,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

// @desc Get single announcement
// @route GET /api/announcement/:id
// @access Public
export const getAnnouncementById = expressAsyncHandler(async (req, res) => {
    const announcement = await Announcement.findById(req.params.id)
        .populate("buyer", "name email")
        .populate("category", "name")
        .populate("responses.vendor", "storeName slug");

    if (!announcement) {
        throw new AppError("Announcement not found", 404);
    }

    res.status(200).json({ status: true, data: announcement });
});

// @desc Get buyer's own announcements
// @route GET /api/announcement/my
// @access Private
export const getMyAnnouncements = expressAsyncHandler(async (req, res) => {
    const announcements = await Announcement.find({ buyer: req.user._id })
        .populate("category", "name")
        .populate("responses.vendor", "storeName slug")
        .sort({ createdAt: -1 });

    res.status(200).json({ status: true, data: announcements });
});

// @desc Vendor respond to announcement
// @route POST /api/announcement/:id/respond
// @access Private (Vendor only)
export const respondToAnnouncement = expressAsyncHandler(async (req, res) => {
    const { message, quotedPrice } = req.body;

    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
        throw new AppError("Announcement not found", 404);
    }

    if (announcement.status !== "open") {
        throw new AppError("This announcement is no longer accepting responses", 400);
    }

    // Get vendor profile from authenticated user
    const vendor = await Vendor.findOne({ user: req.user._id });
    if (!vendor) {
        throw new AppError("Vendor profile not found", 404);
    }

    const vendorId = vendor._id.toString();

    // Check if vendor already responded
    const existingResponse = announcement.responses.find(
        r => r.vendor.toString() === vendorId
    );
    if (existingResponse) {
        throw new AppError("You have already responded to this announcement", 400);
    }

    announcement.responses.push({
        vendor: vendorId,
        message,
        quotedPrice
    });

    await announcement.save();

    res.status(200).json({ status: true, data: announcement });
});

// @desc Update announcement
// @route PUT /api/announcement/:id
// @access Private (Owner only)
export const updateAnnouncement = expressAsyncHandler(async (req, res) => {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
        throw new AppError("Announcement not found", 404);
    }

    if (announcement.buyer.toString() !== req.user._id.toString()) {
        throw new AppError("Not authorized", 403);
    }

    Object.assign(announcement, sanitizeBody(req.body, ALLOWED_FIELDS));
    await announcement.save();

    res.status(200).json({ status: true, data: announcement });
});

// @desc Delete/close announcement
// @route DELETE /api/announcement/:id
// @access Private (Owner only)
export const deleteAnnouncement = expressAsyncHandler(async (req, res) => {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
        throw new AppError("Announcement not found", 404);
    }

    if (announcement.buyer.toString() !== req.user._id.toString()) {
        throw new AppError("Not authorized", 403);
    }

    announcement.isActive = false;
    announcement.status = "closed";
    await announcement.save();

    res.status(200).json({ status: true, message: "Announcement closed" });
});
