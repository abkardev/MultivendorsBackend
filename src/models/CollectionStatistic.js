import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const collectionStatisticSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  database: { type: String },
  size: {
    documents: { type: Number },
    totalSize: { type: Number },
    dataSize: { type: Number },
    indexSize: { type: Number },
    avgObjSize: { type: Number },
  },
  growth: {
    dailyRate: { type: Number },
    weeklyRate: { type: Number },
    monthlyRate: { type: Number },
    projected30Days: { type: Number },
  },
  indexes: { type: Number },
  cache: {
    hitRate: { type: Number },
    missRate: { type: Number },
  },
  performance: {
    avgReadTime: { type: Number },
    avgWriteTime: { type: Number },
    readThroughput: { type: Number },
    writeThroughput: { type: Number },
  },
  metadata: { type: Map, of: String },
}, { timestamps: true });

collectionStatisticSchema.plugin(uniqueValidator, { message: '{PATH} already exists' });

collectionStatisticSchema.index({ name: 1 });

export const CollectionStatistic = mongoose.model('CollectionStatistic', collectionStatisticSchema);
