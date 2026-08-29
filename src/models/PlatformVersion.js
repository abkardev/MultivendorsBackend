import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const schema = new mongoose.Schema({
  version: { type: String, required: true, unique: true },
  buildNumber: { type: String },
  releaseDate: { type: Date },
  status: { type: String, enum: ['alpha', 'beta', 'release_candidate', 'stable', 'deprecated', 'eol'], default: 'stable' },
  edition: { type: String },
  minVersion: { type: String },
  maxVersion: { type: String },
  dependencies: [{
    name: { type: String },
    version: { type: String },
    required: { type: Boolean },
  }],
  checksum: { type: String },
  size: { type: Number },
  releaseNotes: { type: String },
  changelog: { type: String },
  breakingChanges: [{
    title: { type: String },
    description: { type: String },
    migrationGuide: { type: String },
    affectedModules: [{ type: String }],
  }],
  deprecations: [{
    module: { type: String },
    message: { type: String },
    alternative: { type: String },
    deprecatedSince: { type: String },
    removalVersion: { type: String },
  }],
  upgradePaths: [{
    from: { type: String },
    to: { type: String },
    steps: [{ type: String }],
    automated: { type: Boolean },
  }],
  metadata: { type: Map, of: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schema.plugin(uniqueValidator, { message: '{PATH} already exists' });

schema.index({ version: 1 });
schema.index({ status: 1 });
schema.index({ edition: 1 });
schema.index({ releaseDate: -1 });

export const PlatformVersion = mongoose.model('PlatformVersion', schema);
