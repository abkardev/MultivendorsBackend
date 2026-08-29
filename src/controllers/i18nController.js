import expressAsyncHandler from "express-async-handler";
import { Translation } from "../models/Translation.js";
import { AppError } from "../middlewares/errorHandler.js";

// @desc List all translations
// @route GET /api/i18n
// @access Private/Admin
export const listTranslations = expressAsyncHandler(async (req, res) => {
  const { group, search, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (group) filter.group = group;
  if (search) {
    filter.$or = [
      { key: { $regex: search, $options: "i" } },
      { en: { $regex: search, $options: "i" } },
      { ar: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [translations, total] = await Promise.all([
    Translation.find(filter).sort({ key: 1 }).skip(skip).limit(parseInt(limit)),
    Translation.countDocuments(filter),
  ]);

  res.json({
    status: true,
    data: translations,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
  });
});

// @desc Get single translation
// @route GET /api/i18n/:key
// @access Public
export const getTranslation = expressAsyncHandler(async (req, res) => {
  const translation = await Translation.findOne({ key: req.params.key });
  if (!translation) throw new AppError("Translation key not found", 404);
  res.json({ status: true, data: translation });
});

// @desc Create or update translation
// @route PUT /api/i18n/:key
// @access Private/Admin
export const upsertTranslation = expressAsyncHandler(async (req, res) => {
  const { en, ar, fr, es, de, zh, ja, ko, tr, ur, hi, pt, ru, group } = req.body;
  if (!en) throw new AppError("English translation (en) is required", 400);

  const update = { en, group: group || "common" };
  const langs = { ar, fr, es, de, zh, ja, ko, tr, ur, hi, pt, ru };
  for (const [code, val] of Object.entries(langs)) {
    if (val !== undefined) update[code] = val;
  }

  const translation = await Translation.findOneAndUpdate(
    { key: req.params.key },
    { $set: update },
    { upsert: true, new: true, runValidators: true }
  );

  res.json({ status: true, data: translation });
});

// @desc Delete translation
// @route DELETE /api/i18n/:key
// @access Private/Admin
export const deleteTranslation = expressAsyncHandler(async (req, res) => {
  await Translation.findOneAndDelete({ key: req.params.key });
  res.json({ status: true, message: "Translation deleted" });
});

// @desc Get all translations as a flat map (for frontend i18n)
// @route GET /api/i18n/map/:lang
// @access Public
export const getTranslationMap = expressAsyncHandler(async (req, res) => {
  const { lang } = req.params;
  const supported = ["en", "ar", "fr", "es", "de", "zh", "ja", "ko", "tr", "ur", "hi", "pt", "ru"];
  if (!supported.includes(lang)) {
    throw new AppError(`Unsupported language: ${lang}`, 400);
  }

  if (lang === "en") {
    const items = await Translation.find({ isActive: true }).select("key en").lean();
    const map = {};
    for (const item of items) map[item.key] = item.en;
    return res.json({ status: true, data: map });
  }

  // For other languages, return translated value or fallback to English
  const items = await Translation.find({ isActive: true }).select(`key en ${lang}`).lean();
  const map = {};
  for (const item of items) map[item.key] = item[lang] || item.en;
  res.json({ status: true, data: map });
});

// @desc Bulk import translations
// @route POST /api/i18n/bulk
// @access Private/Admin
export const bulkImport = expressAsyncHandler(async (req, res) => {
  const { translations } = req.body;
  if (!Array.isArray(translations) || translations.length === 0) {
    throw new AppError("translations array is required", 400);
  }

  let created = 0;
  let updated = 0;

  for (const t of translations) {
    if (!t.key || !t.en) continue;
    const existing = await Translation.findOne({ key: t.key });
    if (existing) {
      await Translation.updateOne({ key: t.key }, { $set: t });
      updated++;
    } else {
      await Translation.create(t);
      created++;
    }
  }

  res.json({ status: true, data: { created, updated, total: translations.length } });
});
