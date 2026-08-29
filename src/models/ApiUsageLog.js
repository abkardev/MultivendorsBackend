import mongoose from 'mongoose';

const apiUsageLogSchema = new mongoose.Schema({
  developer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  app: { type: mongoose.Schema.Types.ObjectId, ref: 'DeveloperApp' },
  endpoint: { type: String, required: true },
  method: { type: String, required: true },
  statusCode: { type: Number, required: true },
  responseTime: Number,
  ip: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now },
  quota: { type: mongoose.Schema.Types.Mixed },
  cost: { type: Number, default: 0 }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

apiUsageLogSchema.index({ developer: 1, timestamp: -1 });
apiUsageLogSchema.index({ app: 1, timestamp: -1 });
apiUsageLogSchema.index({ endpoint: 1, timestamp: -1 });
apiUsageLogSchema.index({ timestamp: -1 });

export const ApiUsageLog = mongoose.model('ApiUsageLog', apiUsageLogSchema);
