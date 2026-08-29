import expressAsyncHandler from "express-async-handler";
import SpecificationTemplate from "../models/SpecificationTemplate.js";
import { Product } from "../models/productModel.js";
import { AppError } from "../middlewares/errorHandler.js";
import mongoose from "mongoose";

// @desc Get spec template for a taxonomy node
// @route GET /api/specs/template/:taxonomyNodeId
// @access Public
export const getTemplate = expressAsyncHandler(async (req, res) => {
  const template = await SpecificationTemplate.findOne({ taxonomyNode: req.params.taxonomyNodeId });
  res.json({ status: true, data: template || { fields: [] } });
});

// @desc Create or update spec template
// @route PUT /api/specs/template/:taxonomyNodeId
// @access Private/Admin
export const upsertTemplate = expressAsyncHandler(async (req, res) => {
  const { fields } = req.body;
  if (!Array.isArray(fields)) throw new AppError("fields must be an array", 400);

  const template = await SpecificationTemplate.findOneAndUpdate(
    { taxonomyNode: req.params.taxonomyNodeId },
    { taxonomyNode: req.params.taxonomyNodeId, fields, isActive: true },
    { upsert: true, new: true, runValidators: true }
  );
  res.json({ status: true, data: template });
});

// @desc Delete spec template
// @route DELETE /api/specs/template/:id
// @access Private/Admin
export const deleteTemplate = expressAsyncHandler(async (req, res) => {
  await SpecificationTemplate.findByIdAndDelete(req.params.id);
  res.json({ status: true, message: "Template deleted" });
});

// @desc Get filter options for a taxonomy node based on product specs
// @route GET /api/specs/filters/:taxonomyNodeId
// @access Public
export const getFilters = expressAsyncHandler(async (req, res) => {
  const { taxonomyNodeId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(taxonomyNodeId)) {
    return res.json({ status: true, data: [] });
  }

  const template = await SpecificationTemplate.findOne({ taxonomyNode: taxonomyNodeId });
  if (!template) return res.json({ status: true, data: [] });

  const match = { industry: new mongoose.Types.ObjectId(taxonomyNodeId) };
  const pipeline = [
    { $match: match },
    { $unwind: "$specifications" },
    {
      $group: {
        _id: { field: "$specifications.field", value: "$specifications.value" },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.field": 1, count: -1 } },
  ];

  const results = await Product.aggregate(pipeline);
  const filterMap = {};
  for (const r of results) {
    const field = r._id.field;
    if (!filterMap[field]) filterMap[field] = new Set();
    if (r._id.value !== null && r._id.value !== undefined && r._id.value !== '') {
      filterMap[field].add(String(r._id.value));
    }
  }

  const filters = template.fields
    .filter(f => f.type !== 'boolean' || filterMap[f.name])
    .map(f => ({
      name: f.name,
      label: f.label,
      type: f.type,
      unit: f.unit,
      options: f.options.length > 0 ? f.options : Array.from(filterMap[f.name] || []),
      values: Array.from(filterMap[f.name] || []),
    }))
    .filter(f => f.values.length > 0 || f.type === 'boolean' || (f.type === 'dropdown' && f.options.length > 0));

  res.json({ status: true, data: filters });
});
