// DEPRECATED: Use ../middlewares/auth.js instead
// This file is kept for reference only.
// announcementRoutes.js and chatRoutes.js have been migrated to auth.js
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { AppError } from "./errorHandler.js";

export const protect = async (req, res, next) => {
    let token;

    if(
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ){
        try{
            token = req.headers.authorization.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select("-password");
            if (!req.user) {
                return res.status(401).json({ status: false, message: "User no longer exists" });
            }
            return next();
        }catch (error){
            return res.status(401).json({ status: false, message: "Not Authorized" });
        }
    }
    if(!token){
        return res.status(401).json({ status: false, message: "No Token Attached to the Header" });
    }
};

export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ status: false, message: "You Don't Have Permissions" });
        }
        next();
    }
}

export const admin = async (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ status: false, message: "You Don't Have Permissions" });
    }
    next();
};

