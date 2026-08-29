import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetType: {
    type: String,
    enum: ['training_module', 'learning_path'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  completedLessons: [String],
  status: {
    type: String,
    enum: ['enrolled', 'in_progress', 'completed', 'failed'],
    default: 'enrolled'
  },
  startedAt: Date,
  completedAt: Date,
  certificateIssuedAt: Date,
  score: { type: Number }
}, { timestamps: true, toJSON: { virtuals: true } });

enrollmentSchema.index({ user: 1, targetType: 1, targetId: 1 }, { unique: true });
enrollmentSchema.index({ user: 1, status: 1 });
enrollmentSchema.index({ targetType: 1, targetId: 1 });

export const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
