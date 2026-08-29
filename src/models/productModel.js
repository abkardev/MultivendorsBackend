import mongoose from "mongoose";
import slugify from "slugify";

const productVariationSchema = new mongoose.Schema({
  sku: { type: String },
  barcode: { type: String },
  price: { type: Number, required: true },
  stock: { type: Number, default: 0, min: 0 },
  weight: { type: Number },
  images: [String],
  attributes: [{
    name: { type: String, required: true },
    value: { type: String, required: true },
  }],
  isActive: { type: Boolean, default: true },
});

const productSchema = new mongoose.Schema({
    name: {
      en: { type: String, required: true },
      ar: String
    },
    slug: {
      type: String,
      unique: true
    },
    description: {
        en: String,
        ar: String
    },    
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
        required: true
    },
    industry: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TaxonomyNode",
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
    },
    subCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubCategory"
    },
    taxonomyPath: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "TaxonomyNode",
    }],
    brand: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Brand",
    },
    image: [String],
    variations: [productVariationSchema],
    ratingAverage: {
        type: Number,
        default: 0
    },
    ratingQuantity: {
        type: Number,
        default: 0
    },
    reviews: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Review"
        },
    ],
    specifications: [{
        field: { type: String, required: true },
        value: { type: mongoose.Schema.Types.Mixed },
        unit: String,
    }],
    moq: { type: Number, min: 1 },
    leadTimeMin: { type: Number, min: 0 },
    leadTimeMax: { type: Number, min: 0 },
    countryOfOrigin: { type: String, trim: true },
    certifications: [{
        name: { type: String, required: true },
        issuer: { type: String, trim: true },
        fileUrl: { type: String, match: /^https?:\/\// },
    }],
    incoterms: { type: String, enum: ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'] },
    packaging: {
        type: { type: String, enum: ['box', 'crate', 'pallet', 'bag', 'drum', ''] },
        unit: String,
        weight: { type: Number, min: 0 },
        dimensions: {
            length: { type: Number, min: 0 },
            width: { type: Number, min: 0 },
            height: { type: Number, min: 0 },
        },
    },
    // Commercial
    paymentTerms: { type: [String], enum: ['100% Advance', '50/50', 'Net 30', 'Net 60', 'Letter of Credit (L/C)', 'Cash Against Documents (CAD)', 'Other'] },
    acceptedPaymentMethods: [String],
    acceptedCurrencies: { type: [String], default: ['USD'] },
    minOrderValue: { type: Number, min: 0 },
    priceBreaks: [{
      from: { type: Number, min: 1, required: true },
      to: { type: Number, min: 1 },
      price: { type: Number, min: 0, required: true },
      label: String,
    }],
    // Manufacturing
    oemAvailable: { type: Boolean, default: false },
    odmAvailable: { type: Boolean, default: false },
    privateLabelService: { type: Boolean, default: false },
    customManufacturing: { type: Boolean, default: false },
    customPackaging: { type: Boolean, default: false },
    designService: { type: Boolean, default: false },
    prototypeService: { type: Boolean, default: false },
    // Export
    exportLicenseAvailable: { type: Boolean, default: false },
    mainExportMarkets: [String],
    annualExportRevenueRange: String,
    nearestShippingPort: String,
    preferredExportPorts: [String],
    customsDocumentationSupport: { type: Boolean, default: false },
    // Production
    dailyProductionCapacity: { type: Number, min: 0 },
    weeklyProductionCapacity: { type: Number, min: 0 },
    monthlyProductionCapacity: { type: Number, min: 0 },
    annualProductionCapacity: { type: Number, min: 0 },
    productionCycle: String,
    rushOrderSupport: { type: Boolean, default: false },
    // Quality Control
    qualityControlProcess: String,
    thirdPartyInspectionAvailable: { type: Boolean, default: false },
    factoryInspectionAvailable: { type: Boolean, default: false },
    inspectionReports: [{ name: String, fileUrl: String }],
    testingEquipment: [String],
    qualityStandards: [String],
    // R&D
    rdDepartment: { type: Boolean, default: false },
    numberOfEngineers: { type: Number, min: 0 },
    customProductDevelopment: { type: Boolean, default: false },
    newProductDevelopment: { type: Boolean, default: false },
    prototypeDevelopment: { type: Boolean, default: false },
}, {timestamps: true});

productSchema.pre('validate', function (next) {
  if (this.leadTimeMin != null && this.leadTimeMax != null && this.leadTimeMax < this.leadTimeMin) {
    return next(new Error('leadTimeMax must be greater than or equal to leadTimeMin'));
  }
  next();
});

productSchema.pre("save", async function (next) {
  if (this.isModified("name.en") || !this.slug) {
    this.slug = slugify(this.name.en.toLowerCase());
  }
  next();
});

productSchema.index({ vendor: 1 });
productSchema.index({ category: 1 });
productSchema.index({ vendor: 1, category: 1 });
productSchema.index({ countryOfOrigin: 1 });
productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ oemAvailable: 1 });
productSchema.index({ odmAvailable: 1 });
productSchema.index({ privateLabelService: 1 });
productSchema.index({ exportLicenseAvailable: 1 });
productSchema.index({ 'priceBreaks.from': 1 });
productSchema.index({ brand: 1 });
productSchema.index({ industry: 1 });
productSchema.index({ subCategory: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ vendor: 1, createdAt: -1 });
productSchema.index({ category: 1, createdAt: -1 });
productSchema.index({ 'name.en': 'text', 'name.ar': 'text', 'description.en': 'text', 'description.ar': 'text' });

export const Product = mongoose.model("Product", productSchema);
