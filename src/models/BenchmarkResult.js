import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  execution: { type: mongoose.Schema.Types.ObjectId, ref: 'BenchmarkExecution' },
  endpoint: { type: String },
  method: { type: String },
  metric: { type: String },
  value: { type: Number },
  unit: { type: String },
  timestamp: { type: Date },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ execution: 1 });
schema.index({ endpoint: 1 });
schema.index({ metric: 1 });

export const BenchmarkResult = mongoose.model('BenchmarkResult', schema);
