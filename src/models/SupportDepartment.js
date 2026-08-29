import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  nameAr: String,
  description: String,
  descriptionAr: String,
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  agents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  autoAssign: { type: Boolean, default: true },
  assignmentStrategy: { type: String, enum: ['round_robin', 'least_busy', 'manual'], default: 'round_robin' },
  tags: [String],
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

departmentSchema.index({ isActive: 1 });

export const SupportDepartment = mongoose.model('SupportDepartment', departmentSchema);
