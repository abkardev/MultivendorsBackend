import mongoose from "mongoose";
import slugify from "slugify";

const taxonomyNodeSchema = new mongoose.Schema({
  name: {
    en: { type: String, required: true },
    ar: String,
  },
  slug: { type: String, unique: true },
  level: {
    type: Number,
    required: true,
    enum: [0, 1, 2, 3],
    index: true,
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TaxonomyNode",
    default: null,
    index: true,
  },
  icon: { type: String },
  image: { type: String },
  description: { type: String },
  isActive: { type: Boolean, default: true, index: true },
  sortOrder: { type: Number, default: 0 },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

taxonomyNodeSchema.virtual("children", {
  ref: "TaxonomyNode",
  localField: "_id",
  foreignField: "parent",
});

taxonomyNodeSchema.index({ level: 1, parent: 1, sortOrder: 1 });
taxonomyNodeSchema.index({ parent: 1, isActive: 1 });

taxonomyNodeSchema.pre("save", async function (next) {
  if (this.isModified("name.en") || !this.slug) {
    this.slug = slugify(this.name.en.toLowerCase());
  }
  next();
});

const TaxonomyNode = mongoose.model("TaxonomyNode", taxonomyNodeSchema);
export default TaxonomyNode;
