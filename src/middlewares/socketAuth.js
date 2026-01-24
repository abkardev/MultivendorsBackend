import jwt from "jsonwebtoken";
import { User } from "../models/userModel.js";

/**
 * socketAuth middleware for Socket.IO
 * Expects token in socket.handshake.auth.token
 * Accepts "Bearer <token>" or raw token.
 * Verifies JWT using process.env.JWT_SECRET and loads User document.
 * Attaches the user object (without password) to socket.data.user.
 */
export async function socketAuth(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      const err = new Error("Authentication error: token required");
      err.data = { code: "NO_TOKEN" };
      return next(err);
    }

    const raw = token.startsWith("Bearer ") ? token.split(" ")[1] : token;
    let decoded;
    try {
      decoded = jwt.verify(raw, process.env.JWT_SECRET);
    } catch (e) {
      const err = new Error("Authentication error: invalid token");
      err.data = { code: "INVALID_TOKEN" };
      return next(err);
    }

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      const err = new Error("Authentication error: user not found");
      err.data = { code: "USER_NOT_FOUND" };
      return next(err);
    }

    socket.data.user = user;
    return next();
  } catch (err) {
    return next(new Error("Authentication error"));
  }
}
