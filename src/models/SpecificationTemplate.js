import mongoose from "mongoose";

const fieldSchema = new mongoose.Schema({
  name: { type: String, required: true },
  label: {
    en: { type: String, required: true },
    ar: String,
  },
  type: {
    type: String,
    required: true,
    enum: ["text", "number", "decimal", "dropdown", "multi-select", "boolean", "date", "color", "measurement"],
  },
  required: { type: Boolean, default: false },
  options: [{ type: String }],
  unit: { type: String },
  placeholder: {
    en: String,
    ar: String,
  },
  sortOrder: { type: Number, default: 0 },
  validation: {
    min: Number,
    max: Number,
    step: Number,
    pattern: String,
  },
});

const specificationTemplateSchema = new mongoose.Schema({
  taxonomyNode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TaxonomyNode",
    required: true,
    unique: true,
    index: true,
  },
  fields: [fieldSchema],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const SpecificationTemplate = mongoose.model("SpecificationTemplate", specificationTemplateSchema);
export default SpecificationTemplate;
