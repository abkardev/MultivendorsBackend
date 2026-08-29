import mongoose from 'mongoose';

const storeEmployeeSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
    index: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
  },
  permissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission',
  }],
  status: {
    type: String,
    enum: ['active', 'invited', 'suspended'],
    default: 'active',
    index: true,
  },
  invitation: {
    token: String,
    email: String,
    invitedAt: Date,
    expiresAt: Date,
    acceptedAt: Date,
  },
  joinedAt: { type: Date },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  notes: String,
}, { timestamps: true });

storeEmployeeSchema.index({ vendor: 1, user: 1 }, { unique: true });
storeEmployeeSchema.index({ vendor: 1, status: 1 });

storeEmployeeSchema.index({ user: 1 });
storeEmployeeSchema.index({ status: 1, createdAt: -1 });

const StoreEmployee = mongoose.model('StoreEmployee', storeEmployeeSchema);
export default StoreEmployee;
