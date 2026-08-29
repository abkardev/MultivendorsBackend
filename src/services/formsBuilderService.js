import mongoose from 'mongoose';
import { FormDefinition } from '../models/FormDefinition.js';
import { FormSubmission } from '../models/FormSubmission.js';
import { FormApproval } from '../models/FormApproval.js';
import { logAuditEvent } from './auditService.js';

class FormsBuilderService {
  async getForms(filters = {}) {
    const { search, category, status, page = 1, limit = 20 } = filters;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { 'title.en': { $regex: search, $options: 'i' } },
        { 'title.ar': { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      FormDefinition.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate('createdBy', 'name email').lean(),
      FormDefinition.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async getForm(id) {
    const form = await FormDefinition.findById(id).populate('createdBy', 'name email').lean();
    if (!form) throw new Error('Form not found');
    return form;
  }

  async createForm(userId, data) {
    const form = await FormDefinition.create({ ...data, createdBy: userId });
    await logAuditEvent({
      userId, action: 'forms.create', category: 'forms',
      entityType: 'FormDefinition', entityId: form._id,
      newValue: { title: form.title, category: form.category, fieldCount: form.fields?.length },
      description: `Form "${form.title.en}" created`,
    });
    return form;
  }

  async updateForm(userId, id, data) {
    const old = await FormDefinition.findById(id);
    if (!old) throw new Error('Form not found');
    if (old.status === 'archived') throw new Error('Cannot update an archived form');
    const form = await FormDefinition.findByIdAndUpdate(id, { $set: { ...data, version: old.version + 1 } }, { new: true, runValidators: true });
    await logAuditEvent({
      userId, action: 'forms.update', category: 'forms',
      entityType: 'FormDefinition', entityId: id,
      oldValue: { title: old.title, status: old.status, version: old.version },
      newValue: { title: form.title, status: form.status, version: form.version },
      description: `Form "${form.title.en}" updated to v${form.version}`,
    });
    return form;
  }

  async deleteForm(userId, id) {
    const form = await FormDefinition.findById(id);
    if (!form) throw new Error('Form not found');
    form.status = 'archived';
    await form.save();
    await logAuditEvent({
      userId, action: 'forms.delete', category: 'forms',
      entityType: 'FormDefinition', entityId: id,
      oldValue: { status: form._original?.status || 'draft' },
      newValue: { status: 'archived' },
      description: `Form "${form.title.en}" archived`,
    });
    return { message: 'Form archived', id };
  }

  async publishForm(userId, id) {
    const form = await FormDefinition.findById(id);
    if (!form) throw new Error('Form not found');
    if (form.status === 'archived') throw new Error('Cannot publish an archived form');
    if (!form.fields || form.fields.length === 0) throw new Error('Cannot publish a form with no fields');
    form.status = 'published';
    form.version += 1;
    await form.save();
    await logAuditEvent({
      userId, action: 'forms.publish', category: 'forms',
      entityType: 'FormDefinition', entityId: id,
      oldValue: { status: 'draft' },
      newValue: { status: 'published', version: form.version },
      description: `Form "${form.title.en}" published (v${form.version})`,
    });
    return form;
  }

  async duplicateForm(userId, id) {
    const original = await FormDefinition.findById(id).lean();
    if (!original) throw new Error('Form not found');
    const { _id, createdAt, updatedAt, __v, createdBy, ...rest } = original;
    const data = {
      ...rest,
      title: {
        en: `${rest.title.en} (Copy)`,
        ar: rest.title.ar ? `${rest.title.ar} (نسخة)` : undefined,
      },
      status: 'draft',
      version: 1,
      createdBy: userId,
    };
    const copy = await FormDefinition.create(data);
    await logAuditEvent({
      userId, action: 'forms.duplicate', category: 'forms',
      entityType: 'FormDefinition', entityId: copy._id,
      newValue: { originalId: id, title: copy.title, fieldCount: copy.fields?.length },
      description: `Form duplicated from "${original.title.en}" to "${copy.title.en}"`,
    });
    return copy;
  }

  async getSubmissions(formId, filters = {}) {
    const { status, search, page = 1, limit = 20 } = filters;
    const filter = { form: new mongoose.Types.ObjectId(formId) };
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      FormSubmission.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate('submittedBy', 'name email').populate('approvedBy', 'name email').lean(),
      FormSubmission.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async getSubmission(id) {
    const submission = await FormSubmission.findById(id).populate('submittedBy', 'name email').populate('approvedBy', 'name email').lean();
    if (!submission) throw new Error('Submission not found');
    return submission;
  }

  async createSubmission(userId, formId, data) {
    const form = await FormDefinition.findById(formId).lean();
    if (!form) throw new Error('Form not found');
    if (form.status !== 'published') throw new Error('Form is not published');
    if (form.settings?.maxSubmissions) {
      const count = await FormSubmission.countDocuments({ form: formId, submittedBy: userId });
      if (count >= form.settings.maxSubmissions) throw new Error('Maximum submissions reached for this form');
    }
    const submission = await FormSubmission.create({
      form: formId,
      data: data.fields || data,
      files: data.files || [],
      status: 'submitted',
      submittedBy: userId,
      submittedAt: new Date(),
    });
    await logAuditEvent({
      userId, action: 'forms.submit', category: 'forms',
      entityType: 'FormSubmission', entityId: submission._id,
      newValue: { formId, fieldCount: Object.keys(data.fields || data).length },
      description: `Submission created for form "${form.title.en}"`,
    });
    return submission;
  }

  async updateSubmission(userId, id, data) {
    const submission = await FormSubmission.findById(id);
    if (!submission) throw new Error('Submission not found');
    if (submission.status !== 'draft' && submission.status !== 'needs_revision') throw new Error('Only drafts or revisions can be updated');
    if (data.fields) submission.data = data.fields;
    if (data.files) submission.files = data.files;
    if (data.status) submission.status = data.status;
    await submission.save();
    await logAuditEvent({
      userId, action: 'forms.submission_update', category: 'forms',
      entityType: 'FormSubmission', entityId: id,
      newValue: { status: submission.status },
      description: `Submission ${id} updated`,
    });
    return submission;
  }

  async approveSubmission(userId, id, comment) {
    const submission = await FormSubmission.findById(id);
    if (!submission) throw new Error('Submission not found');
    if (submission.status !== 'submitted') throw new Error('Only submitted submissions can be approved');
    submission.status = 'approved';
    submission.approvedBy = userId;
    submission.approvedAt = new Date();
    submission.reviewerNotes = comment || '';
    await submission.save();
    const form = await FormDefinition.findById(submission.form).lean();
    await FormApproval.create({
      submission: id, approver: userId,
      status: 'approved', comment: comment || '',
      signedAt: new Date(),
    });
    await logAuditEvent({
      userId, action: 'forms.approve', category: 'forms',
      entityType: 'FormSubmission', entityId: id,
      newValue: { status: 'approved', formId: submission.form },
      description: `Submission ${id} approved for form "${form?.title?.en || 'N/A'}"`,
    });
    return submission;
  }

  async rejectSubmission(userId, id, reason) {
    if (!reason) throw new Error('Rejection reason is required');
    const submission = await FormSubmission.findById(id);
    if (!submission) throw new Error('Submission not found');
    if (submission.status !== 'submitted') throw new Error('Only submitted submissions can be rejected');
    submission.status = 'rejected';
    submission.rejectionReason = reason;
    submission.approvedBy = userId;
    submission.approvedAt = new Date();
    await submission.save();
    await FormApproval.create({
      submission: id, approver: userId,
      status: 'rejected', comment: reason,
      signedAt: new Date(),
    });
    await logAuditEvent({
      userId, action: 'forms.reject', category: 'forms',
      entityType: 'FormSubmission', entityId: id,
      newValue: { status: 'rejected', reason },
      description: `Submission ${id} rejected: ${reason}`,
    });
    return submission;
  }

  async getFormAnalytics(id) {
    const form = await FormDefinition.findById(id).lean();
    if (!form) throw new Error('Form not found');
    const stats = await FormSubmission.aggregate([
      { $match: { form: new mongoose.Types.ObjectId(id) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const total = stats.reduce((acc, s) => acc + s.count, 0);
    const statusMap = {};
    for (const s of stats) statusMap[s._id] = s.count;
    const approvedCount = statusMap.approved || 0;
    const rejectedCount = statusMap.rejected || 0;
    return {
      total,
      draft: statusMap.draft || 0,
      submitted: statusMap.submitted || 0,
      approved: approvedCount,
      rejected: rejectedCount,
      needsRevision: statusMap.needs_revision || 0,
      approvalRate: total > 0 ? Math.round((approvedCount / total) * 100) : 0,
      rejectionRate: total > 0 ? Math.round((rejectedCount / total) * 100) : 0,
      pendingReview: (statusMap.submitted || 0) + (statusMap.needs_revision || 0),
    };
  }

  async validateFormData(formId, data) {
    const form = await FormDefinition.findById(formId).lean();
    if (!form) throw new Error('Form not found');
    const errors = [];
    if (!form.fields || form.fields.length === 0) return { valid: true, errors: [] };
    for (const field of form.fields) {
      const value = data[field.fieldId];
      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push({ field: field.fieldId, message: `${field.label?.en || field.fieldId} is required` });
        continue;
      }
      if (value === undefined || value === null || value === '') continue;
      if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors.push({ field: field.fieldId, message: `Invalid email format` });
      }
      if (field.type === 'number' || field.type === 'email') {
        if (field.validation?.min !== undefined && Number(value) < field.validation.min) {
          errors.push({ field: field.fieldId, message: `Minimum value is ${field.validation.min}` });
        }
        if (field.validation?.max !== undefined && Number(value) > field.validation.max) {
          errors.push({ field: field.fieldId, message: `Maximum value is ${field.validation.max}` });
        }
      }
      if (field.validation?.pattern && value) {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(String(value))) {
          errors.push({ field: field.fieldId, message: `Invalid format for ${field.label?.en || field.fieldId}` });
        }
      }
      if ((field.type === 'select' || field.type === 'multi_select' || field.type === 'radio') && field.options?.length > 0) {
        const validValues = field.options.map(o => o.value);
        if (Array.isArray(value)) {
          for (const v of value) { if (!validValues.includes(v)) errors.push({ field: field.fieldId, message: `Invalid option: ${v}` }); }
        } else if (value && !validValues.includes(value)) {
          errors.push({ field: field.fieldId, message: `Invalid option: ${value}` });
        }
      }
    }
    return { valid: errors.length === 0, errors };
  }
}

export const formsBuilderService = new FormsBuilderService();
