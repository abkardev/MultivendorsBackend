import mongoose from 'mongoose';

const queryExecutionSchema = new mongoose.Schema({
  query: { type: String, required: true },
  collection: { type: String, required: true },
  operation: { type: String },
  duration: { type: Number, required: true },
  documentsExamined: { type: Number },
  documentsReturned: { type: Number },
  indexUsed: { type: String },
  stage: { type: String },
  executionTime: { type: Number },
  memoryUsage: { type: Number },
  sortInMemory: { type: Boolean },
  noTableScan: { type: Boolean },
  examinedReturnedRatio: { type: Number },
  timestamp: { type: Date, default: Date.now },
  metadata: { type: Map, of: String },
}, { timestamps: true });

queryExecutionSchema.index({ collection: 1, timestamp: -1 });
queryExecutionSchema.index({ duration: -1 });
queryExecutionSchema.index({ timestamp: 1 });

export const QueryExecution = mongoose.model('QueryExecution', queryExecutionSchema);
