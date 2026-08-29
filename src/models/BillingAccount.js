import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const schema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  accountNumber: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String },
  taxId: { type: String },
  taxExempt: { type: Boolean, default: false },
  billingEmail: { type: String },
  billingAddress: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    zip: { type: String },
    country: { type: String },
  },
  currency: { type: String, default: 'USD' },
  balance: { type: Number, default: 0 },
  credits: { type: Number, default: 0 },
  outstandingBalance: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['active', 'past_due', 'suspended', 'closed'],
    default: 'active',
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly', 'quarterly'],
    default: 'monthly',
  },
  nextBillingDate: { type: Date },
  lastBillingDate: { type: Date },
  paymentTerms: { type: Number, default: 30 },
  metadata: { type: Map, of: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schema.plugin(uniqueValidator, { message: '{PATH} already exists' });

schema.index({ accountNumber: 1 });
schema.index({ tenant: 1 });
schema.index({ status: 1 });
schema.index({ tenant: 1, status: 1 });

export const BillingAccount = mongoose.model('BillingAccount', schema);
