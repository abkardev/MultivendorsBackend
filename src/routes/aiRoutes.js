import express from "express";
import OpenAI from "openai";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /api/ai
router.post("/", protect, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || prompt.trim().length === 0) return res.status(400).json({ status: false, error: "Prompt required" });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800
    });

    const text = response.choices?.[0]?.message?.content || response.choices?.[0]?.text || "";
    res.json({ status: true, data: text });
  } catch (err) {
    console.error("AI error", err);
    res.status(500).json({ status: false, error: err.message });
  }
});

export default router;
