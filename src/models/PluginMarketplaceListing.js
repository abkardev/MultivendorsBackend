import mongoose from 'mongoose';

const pluginMarketplaceListingSchema = new mongoose.Schema({
  plugin: { type: mongoose.Schema.Types.ObjectId, ref: 'PluginDefinition', required: true, unique: true },
  price: { type: Number, default: 0 },
  subscription: { type: Boolean, default: false },
  trial: { type: Number },
  featured: { type: Boolean, default: false },
  categories: [{ type: String }],
  screenshots: [{ type: String }],
  requirements: { type: String },
  changelog: [{
    version: { type: String },
    date: { type: Date },
    changes: { type: String },
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

pluginMarketplaceListingSchema.index({ plugin: 1 });
pluginMarketplaceListingSchema.index({ featured: 1, price: 1 });
pluginMarketplaceListingSchema.index({ categories: 1 });

const PluginMarketplaceListing = mongoose.model('PluginMarketplaceListing', pluginMarketplaceListingSchema);
export default PluginMarketplaceListing;
