// import mongoose from 'mongoose';

// const schema = new mongoose.Schema({
//   name: { type: String },
//   description: { type: String },
//   headOf: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//   parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
//   company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
//   isActive: { type: Boolean, default: true },
// }, { timestamps: true });

// schema.index({ parent: 1 });
// schema.index({ company: 1 });
// schema.index({ isActive: 1 });

// export const Department = mongoose.model('Department', schema);
import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: {
    en: { type: String, required: true, trim: true },
    ar: { type: String, required: true, trim: true },
  },

  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },

  description: {
    en: { type: String },
    ar: { type: String },
  },

  headOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
  },

  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
  },

  isActive: {
    type: Boolean,
    default: true,
  },

}, { timestamps: true });

schema.index({ parent: 1 });
schema.index({ company: 1 });
schema.index({ isActive: 1 });

export const Department = mongoose.model('Department', schema);