import mongoose from 'mongoose';

const interactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['message', 'order', 'rfq', 'quote', 'note', 'email', 'call'],
    required: true,
  },
  description: String,
  date: { type: Date, default: Date.now },
  relatedId: mongoose.Schema.Types.ObjectId,
}, { _id: false });

const noteSchema = new mongoose.Schema({
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const crmContactSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: String,
  email: String,
  phone: String,
  tags: [String],
  status: {
    type: String,
    enum: ['lead', 'active', 'inactive', 'lost'],
    default: 'active',
  },
  notes: [noteSchema],
  interactions: [interactionSchema],
}, { timestamps: true });

crmContactSchema.index({ vendor: 1, buyer: 1 }, { unique: true });
crmContactSchema.index({ vendor: 1, status: 1 });
crmContactSchema.index({ status: 1, createdAt: -1 });
crmContactSchema.index({ vendor: 1, createdAt: -1 });

export const CrmContact = mongoose.model('CrmContact', crmContactSchema);
