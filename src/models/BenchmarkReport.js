import mongoose from 'mongoose';

const benchmarkReportSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly', 'custom'],
    required: true,
  },
  period: {
    start: { type: Date, required: true },
    end: { type: Date, required: true },
  },
  comparisonPeriod: {
    start: { type: Date },
    end: { type: Date },
  },
  categories: [{
    name: { type: String },
    currentValue: { type: Number },
    previousValue: { type: Number },
    variance: { type: Number },
    growth: { type: Number },
    trend: { type: String, enum: ['up', 'down', 'stable'] },
    benchmarks: [{
      entity: { type: String },
      value: { type: Number },
      rank: { type: Number },
    }],
  }],
  overall: {
    score: Number,
    percentile: Number,
    trend: { type: String, enum: ['up', 'down', 'stable'] },
    summary: String,
  },
  generatedAt: { type: Date },
}, { timestamps: true, toJSON: { virtuals: true } });

benchmarkReportSchema.index({ type: 1, 'period.start': -1 });
benchmarkReportSchema.index({ generatedAt: -1 });
benchmarkReportSchema.index({ name: 1 });

export const BenchmarkReport = mongoose.model('BenchmarkReport', benchmarkReportSchema);
