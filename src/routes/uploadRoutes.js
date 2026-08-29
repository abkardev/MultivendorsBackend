import express from "express";
import { deleteFile, uploadFile } from "../controllers/uploadController.js";
import { protect } from "../middlewares/auth.js";
import { createUploadMiddleware, UPLOAD_CATEGORIES } from "../middlewares/uploadMiddleware.js";

const uploadRouter = express.Router();
const generalUpload = createUploadMiddleware(UPLOAD_CATEGORIES.GENERAL);

uploadRouter.post("/upload-file", protect, generalUpload.single("file"), uploadFile);
uploadRouter.delete("/delete-file/:fileName", protect, deleteFile);

export default uploadRouter;
