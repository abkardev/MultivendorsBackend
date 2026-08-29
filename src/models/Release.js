import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const schema = new mongoose.Schema({
  version: { type: String, required: true, unique: true },
  name: { type: String },
  buildNumber: { type: String },
  status: {
    type: String,
    enum: ['draft', 'alpha', 'beta', 'release_candidate', 'stable', 'deprecated', 'eol'],
    default: 'draft',
  },
  type: {
    type: String,
    enum: ['major', 'minor', 'patch', 'hotfix', 'security'],
    default: 'patch',
  },
  releaseDate: { type: Date },
  isSecurityRelease: { type: Boolean, default: false },
  isCritical: { type: Boolean, default: false },
  changelog: { type: String },
  highlights: [{ type: String }],
  breakingChanges: [{
    title: { type: String },
    description: { type: String },
    migrationUrl: { type: String },
    affectedModules: [{ type: String }],
  }],
  deprecations: [{
    module: { type: String },
    message: { type: String },
    alternative: { type: String },
    deprecatedSince: { type: String },
    removalVersion: { type: String },
  }],
  upgradeInstructions: { type: String },
  minimumUpgradeFrom: { type: String },
  downloadUrl: { type: String },
  packageSize: { type: Number },
  checksum: { type: String },
  gitTag: { type: String },
  gitCommit: { type: String },
  metadata: { type: Map, of: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schema.plugin(uniqueValidator, { message: '{PATH} already exists' });

schema.index({ version: 1 });
schema.index({ status: 1 });
schema.index({ type: 1 });
schema.index({ releaseDate: -1 });
schema.index({ status: 1, releaseDate: -1 });

export const Release = mongoose.model('Release', schema);
