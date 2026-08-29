import mongoose from 'mongoose';

const idempotencySchema = new mongoose.Schema({
  key: { type: String, required: true },
  method: { type: String, required: true },
  path: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  statusCode: Number,
  responseBody: mongoose.Schema.Types.Mixed,
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
}, { timestamps: true });

idempotencySchema.index({ key: 1, method: 1, path: 1 }, { unique: true });

export default mongoose.model('Idempotency', idempotencySchema);
