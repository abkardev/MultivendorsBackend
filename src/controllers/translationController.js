import expressAsyncHandler from "express-async-handler";
import { translateText, translateBatch, getSupportedLanguages } from "../services/translationService.js";
import { AppError } from "../middlewares/errorHandler.js";

// @desc Translate a single text
// @route POST /api/translate
// @access Private
export const translate = expressAsyncHandler(async (req, res) => {
  const { text, targetLang, sourceLang } = req.body;
  if (!text) throw new AppError("text is required", 400);
  if (!targetLang) throw new AppError("targetLang is required", 400);
  if (typeof text !== "string" || text.length > 5000) {
    throw new AppError("text must be a string under 5000 characters", 400);
  }

  const result = await translateText(text, targetLang, sourceLang);
  res.json({ status: true, data: { original: text, translated: result, lang: targetLang } });
});

// @desc Translate multiple texts
// @route POST /api/translate/batch
// @access Private
export const translateBatchEndpoint = expressAsyncHandler(async (req, res) => {
  const { items, targetLang, sourceLang } = req.body;
  if (!Array.isArray(items) || items.length === 0) throw new AppError("items array is required", 400);
  if (!targetLang) throw new AppError("targetLang is required", 400);

  const results = await translateBatch(items, targetLang, sourceLang);
  res.json({ status: true, data: results });
});

// @desc Get supported languages
// @route GET /api/translate/languages
// @access Public
export const getLanguages = expressAsyncHandler(async (req, res) => {
  res.json({ status: true, data: getSupportedLanguages() });
});
