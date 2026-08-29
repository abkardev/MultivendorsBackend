import expressAsyncHandler from "express-async-handler";
import TaxonomyNode from "../models/TaxonomyNode.js";
import { AppError } from "../middlewares/errorHandler.js";
import { sanitizeBody } from "../utils/sanitize.js";

const ALLOWED = ["name", "nameEn", "nameAr", "level", "parent", "icon", "image", "description", "isActive", "sortOrder", "metadata"];

// @desc Create a taxonomy node
// @route POST /api/taxonomy
// @access Private/Admin
export const createNode = expressAsyncHandler(async (req, res) => {
  const body = sanitizeBody(req.body, ALLOWED);
  const node = await TaxonomyNode.create({
    name: { en: body.nameEn || body.name?.en, ar: body.nameAr || body.name?.ar },
    level: body.level,
    parent: body.parent || null,
    icon: body.icon,
    image: body.image,
    description: body.description,
    isActive: body.isActive !== undefined ? body.isActive : true,
    sortOrder: body.sortOrder || 0,
    metadata: body.metadata,
  });
  res.status(201).json({ status: true, data: node });
});

// @desc Get all taxonomy nodes with optional level filter
// @route GET /api/taxonomy
// @access Public
export const getAllNodes = expressAsyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.level) filter.level = parseInt(req.query.level);
  if (req.query.isActive) filter.isActive = req.query.isActive === "true";
  if (req.query.parent) filter.parent = req.query.parent === "null" ? null : req.query.parent;

  const nodes = await TaxonomyNode.find(filter).sort({ level: 1, sortOrder: 1, "name.en": 1 }).populate("parent", "name slug level");
  res.json({ status: true, data: nodes });
});

// @desc Get taxonomy tree (hierarchical)
// @route GET /api/taxonomy/tree
// @access Public
export const getTree = expressAsyncHandler(async (req, res) => {
  const all = await TaxonomyNode.find({ isActive: true }).sort({ level: 1, sortOrder: 1 });
  const map = {};
  const roots = [];
  all.forEach(n => { map[n._id] = { ...n.toObject(), children: [] }; });
  all.forEach(n => {
    if (n.parent && map[n.parent]) {
      map[n.parent].children.push(map[n._id]);
    } else if (n.level === 0) {
      roots.push(map[n._id]);
    }
  });
  res.json({ status: true, data: roots });
});

// @desc Get single node
// @route GET /api/taxonomy/:id
// @access Public
export const getNode = expressAsyncHandler(async (req, res) => {
  const node = await TaxonomyNode.findById(req.params.id).populate("parent", "name slug level");
  if (!node) throw new AppError("Node not found", 404);
  res.json({ status: true, data: node });
});

// @desc Update a node
// @route PUT /api/taxonomy/:id
// @access Private/Admin
export const updateNode = expressAsyncHandler(async (req, res) => {
  const body = sanitizeBody(req.body, ALLOWED);
  const update = {};
  if (body.nameEn || body.name?.en) update["name.en"] = body.nameEn || body.name.en;
  if (body.nameAr || body.name?.ar) update["name.ar"] = body.nameAr || body.name.ar;
  if (body.level !== undefined) update.level = body.level;
  if (body.parent !== undefined) update.parent = body.parent || null;
  if (body.icon !== undefined) update.icon = body.icon;
  if (body.image !== undefined) update.image = body.image;
  if (body.description !== undefined) update.description = body.description;
  if (body.isActive !== undefined) update.isActive = body.isActive;
  if (body.sortOrder !== undefined) update.sortOrder = body.sortOrder;
  if (body.metadata !== undefined) update.metadata = body.metadata;

  const node = await TaxonomyNode.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!node) throw new AppError("Node not found", 404);
  res.json({ status: true, data: node });
});

// @desc Delete a node
// @route DELETE /api/taxonomy/:id
// @access Private/Admin
export const deleteNode = expressAsyncHandler(async (req, res) => {
  const children = await TaxonomyNode.countDocuments({ parent: req.params.id });
  if (children > 0) {
    return res.status(400).json({ status: false, message: "Cannot delete node with children. Remove or reassign children first." });
  }
  const node = await TaxonomyNode.findByIdAndDelete(req.params.id);
  if (!node) throw new AppError("Node not found", 404);
  res.json({ status: true, message: "Node deleted" });
});

// @desc Merge nodes (replace oldId with targetId)
// @route POST /api/taxonomy/merge
// @access Private/Admin
export const mergeNodes = expressAsyncHandler(async (req, res) => {
  const { sourceId, targetId } = req.body;
  if (!sourceId || !targetId) throw new AppError("sourceId and targetId required", 400);

  await TaxonomyNode.updateMany({ parent: sourceId }, { parent: targetId });
  await TaxonomyNode.findByIdAndDelete(sourceId);
  res.json({ status: true, message: "Nodes merged" });
});
