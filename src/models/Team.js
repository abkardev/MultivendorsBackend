import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String },
  description: { type: String },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String }
  }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

schema.index({ department: 1 });
schema.index({ company: 1 });
schema.index({ lead: 1 });
schema.index({ isActive: 1 });

export const Team = mongoose.model('Team', schema);
