import mongoose from 'mongoose';

const formSubmissionSchema = new mongoose.Schema({
  form: { type: mongoose.Schema.Types.ObjectId, ref: 'FormDefinition', required: true },
  data: { type: mongoose.Schema.Types.Mixed },
  files: [{
    fieldId: String,
    url: String,
    name: String,
    size: Number,
  }],
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rejected', 'needs_revision'],
    default: 'draft',
  },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  submittedAt: Date,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  rejectionReason: String,
  metadata: mongoose.Schema.Types.Mixed,
  reviewerNotes: String,
}, { timestamps: true, toJSON: { virtuals: true } });

formSubmissionSchema.index({ form: 1, status: 1 });
formSubmissionSchema.index({ submittedBy: 1 });
formSubmissionSchema.index({ status: 1, createdAt: -1 });
formSubmissionSchema.index({ submittedAt: -1 });

export const FormSubmission = mongoose.model('FormSubmission', formSubmissionSchema);
