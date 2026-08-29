import expressAsyncHandler from "express-async-handler";
import storageService from "../services/storageService.js";
import { STORAGE_CONFIG } from "../config/storage.js";

const LEGACY_MODE = process.env.STORAGE_LEGACY_BUNNYCDN === 'true';

let bunnycdn;
if (LEGACY_MODE) {
  const https = await import('https');
  const fs = await import('fs');
  bunnycdn = { https: https.default, fs: fs.default };
}

export const uploadFile = expressAsyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ status: false, message: "No file attached" });
    }

    if (LEGACY_MODE) {
        return legacyUpload(req, res);
    }

    const { category = 'general', subCategory = 'uploads', entityType, entityId } = req.body;

    const file = await storageService.uploadFile({
        filePath: req.file.path,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        category,
        subCategory,
        uploadedBy: req.user._id,
        entityType,
        entityId,
        metadata: { role: req.user.role, ipAddress: req.ip, userAgent: req.headers['user-agent'] },
    });

    res.status(201).json({
        status: true,
        message: "File uploaded successfully",
        data: {
            _id: file._id,
            originalName: file.originalName,
            storageKey: file.storageKey,
            mimeType: file.mimeType,
            size: file.size,
            category: file.category,
            subCategory: file.subCategory,
            isPublic: file.isPublic,
        },
    });
});

export const deleteFile = expressAsyncHandler(async (req, res) => {
    if (LEGACY_MODE) {
        return legacyDelete(req, res);
    }

    await storageService.deleteFile(req.params.fileName || req.params.id, req.user._id);
    res.status(200).json({ status: true, message: "File deleted successfully" });
});

// Legacy BunnyCDN support for backward compatibility
async function legacyUpload(req, res) {
    const { https, fs } = bunnycdn;
    const file = req.file;
    const filePath = file.path;
    const fileName = encodeURIComponent(file.originalname);
    const readStream = fs.createReadStream(filePath);

    const options = {
        method: "PUT",
        hostname: STORAGE_CONFIG.cloudflare.r2.publicUrl || "storage.bunnycdn.com",
        path: `/mve-storage-ecom/${fileName}`,
        headers: {
            AccessKey: process.env.BUNNYCDN_ACCESS_KEY,
            "Content-Type": "application/octet-stream",
        },
    };

    const reqBunny = https.request(options, (response) => {
        let responseBody = "";
        response.on("data", (chunk) => { responseBody += chunk; });
        response.on("end", () => {
            fs.unlink(filePath, () => {});
            if (response.statusCode === 201 || response.statusCode === 200) {
                res.status(201).json({ status: true, msg: "File uploaded successfully", path: `mve-storage-ecom/${fileName}` });
            } else {
                res.status(response.statusCode).json({ status: false, msg: "File upload failed", response: responseBody });
            }
        });
    });

    reqBunny.on("error", (error) => {
        fs.unlink(filePath, () => {});
        res.status(500).json({ status: false, msg: "File upload failed", error: error.message });
    });

    readStream.pipe(reqBunny);
}

async function legacyDelete(req, res) {
    const url = `https://storage.bunnycdn.com/mve-storage-ecom/${req.params.fileName}`;
    try {
        const response = await fetch(url, {
            method: "DELETE",
            headers: { AccessKey: process.env.BUNNYCDN_ACCESS_KEY },
        });
        if (response.ok) {
            res.status(200).json({ status: true, msg: "File Deleted Successfully" });
        } else {
            const errorText = await response.text();
            res.status(response.status).json({ status: false, msg: `Error deleting file: ${errorText}` });
        }
    } catch (error) {
        res.status(500).json({ status: false, msg: "Error deleting file" });
    }
}
