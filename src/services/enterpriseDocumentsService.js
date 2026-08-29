import mongoose from 'mongoose';
import { Document } from '../models/Document.js';
import { DocumentFolder } from '../models/DocumentFolder.js';
import { DocumentTemplate } from '../models/DocumentTemplate.js';
import { DocumentVersion } from '../models/DocumentVersion.js';
import { DocumentComment } from '../models/DocumentComment.js';
import { DocumentApproval } from '../models/DocumentApproval.js';
import { logAuditEvent } from './auditService.js';

class EnterpriseDocumentsService {
  async getFolders(parentId) {
    const filter = {};
    if (parentId === undefined || parentId === null) filter.parent = { $exists: false };
    else filter.parent = new mongoose.Types.ObjectId(parentId);
    const folders = await DocumentFolder.find(filter).sort({ name: 1 }).populate('createdBy', 'name email').lean();
    const children = await Promise.all(
      folders.map(async (f) => {
        const childFolders = await DocumentFolder.countDocuments({ parent: f._id });
        return { ...f, hasChildren: childFolders > 0 };
      }),
    );
    return children;
  }

  async createFolder(userId, data) {
    if (data.parent) {
      const parent = await DocumentFolder.findById(data.parent);
      if (!parent) throw new Error('Parent folder not found');
    }
    const folder = await DocumentFolder.create({ ...data, createdBy: userId });
    await logAuditEvent({
      userId, action: 'documents.folder.create', category: 'documents',
      entityType: 'DocumentFolder', entityId: folder._id,
      newValue: { name: folder.name, parent: data.parent },
      description: `Folder "${folder.name}" created`,
    });
    return folder;
  }

  async updateFolder(userId, id, data) {
    const folder = await DocumentFolder.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!folder) throw new Error('Folder not found');
    await logAuditEvent({
      userId, action: 'documents.folder.update', category: 'documents',
      entityType: 'DocumentFolder', entityId: id,
      newValue: { name: folder.name },
      description: `Folder "${folder.name}" updated`,
    });
    return folder;
  }

  async deleteFolder(userId, id) {
    const folder = await DocumentFolder.findById(id);
    if (!folder) throw new Error('Folder not found');
    await Document.updateMany({ folder: id }, { $unset: { folder: '' } });
    await DocumentFolder.deleteOne({ _id: id });
    await logAuditEvent({
      userId, action: 'documents.folder.delete', category: 'documents',
      entityType: 'DocumentFolder', entityId: id,
      oldValue: { name: folder.name },
      description: `Folder "${folder.name}" deleted, documents moved to root`,
    });
    return { message: 'Folder deleted', id };
  }

  async getDocuments(folderId, filters = {}) {
    const { search, tags, type, status, page = 1, limit = 20 } = filters;
    const filter = { status: { $ne: 'deleted' } };
    if (folderId) filter.folder = new mongoose.Types.ObjectId(folderId);
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (tags) {
      const tagList = Array.isArray(tags) ? tags : tags.split(',');
      filter.tags = { $in: tagList };
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Document.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate('createdBy', 'name email').populate('folder', 'name').lean(),
      Document.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async getDocument(id) {
    const doc = await Document.findById(id).populate('createdBy', 'name email').populate('folder', 'name').lean();
    if (!doc) throw new Error('Document not found');
    const [versions, comments, approvals] = await Promise.all([
      DocumentVersion.find({ document: id }).sort({ versionNumber: -1 }).populate('createdBy', 'name email').lean(),
      DocumentComment.find({ document: id }).sort({ createdAt: -1 }).populate('createdBy', 'name email').lean(),
      DocumentApproval.find({ document: id }).sort({ createdAt: -1 }).populate('approver', 'name email').lean(),
    ]);
    return { ...doc, versions, comments, approvals };
  }

  async createDocument(userId, data) {
    if (data.folder) {
      const folder = await DocumentFolder.findById(data.folder);
      if (!folder) throw new Error('Folder not found');
    }
    const doc = await Document.create({
      title: data.title,
      description: data.description,
      folder: data.folder,
      tags: data.tags || [],
      file: data.file,
      type: data.type || 'other',
      status: 'draft',
      version: 1,
      metadata: data.metadata,
      createdBy: userId,
    });
    if (data.file) {
      await DocumentVersion.create({
        document: doc._id,
        versionNumber: 1,
        file: data.file,
        changeLog: 'Initial version',
        createdBy: userId,
      });
    }
    await logAuditEvent({
      userId, action: 'documents.create', category: 'documents',
      entityType: 'Document', entityId: doc._id,
      newValue: { title: doc.title, type: doc.type, folder: data.folder },
      description: `Document "${doc.title}" created`,
    });
    return doc;
  }

  async updateDocument(userId, id, data) {
    const old = await Document.findById(id);
    if (!old) throw new Error('Document not found');
    if (old.status === 'deleted') throw new Error('Cannot update a deleted document');
    if (data.folder) {
      const folder = await DocumentFolder.findById(data.folder);
      if (!folder) throw new Error('Folder not found');
    }
    const doc = await Document.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    await logAuditEvent({
      userId, action: 'documents.update', category: 'documents',
      entityType: 'Document', entityId: id,
      oldValue: { title: old.title, folder: old.folder },
      newValue: { title: doc.title, folder: doc.folder },
      description: `Document "${doc.title}" updated`,
    });
    return doc;
  }

  async deleteDocument(userId, id) {
    const doc = await Document.findById(id);
    if (!doc) throw new Error('Document not found');
    doc.status = 'deleted';
    await doc.save();
    await logAuditEvent({
      userId, action: 'documents.delete', category: 'documents',
      entityType: 'Document', entityId: id,
      oldValue: { status: doc._original?.status || 'published' },
      newValue: { status: 'deleted' },
      description: `Document "${doc.title}" soft-deleted`,
    });
    return { message: 'Document deleted', id };
  }

  async getDocumentVersions(docId) {
    const doc = await Document.findById(docId).lean();
    if (!doc) throw new Error('Document not found');
    const versions = await DocumentVersion.find({ document: docId }).sort({ versionNumber: -1 }).populate('createdBy', 'name email').lean();
    return versions;
  }

  async createDocumentVersion(userId, docId, data) {
    const doc = await Document.findById(docId);
    if (!doc) throw new Error('Document not found');
    if (doc.status === 'deleted') throw new Error('Cannot add version to a deleted document');
    const newVersion = doc.version + 1;
    const version = await DocumentVersion.create({
      document: docId,
      versionNumber: newVersion,
      file: data.file,
      changeLog: data.changeLog || `Version ${newVersion}`,
      createdBy: userId,
    });
    doc.version = newVersion;
    if (data.file) {
      doc.file = data.file;
    }
    await doc.save();
    await logAuditEvent({
      userId, action: 'documents.version.create', category: 'documents',
      entityType: 'DocumentVersion', entityId: version._id,
      newValue: { documentId: docId, versionNumber: newVersion, changeLog: data.changeLog },
      description: `Version ${newVersion} created for "${doc.title}"`,
    });
    return version;
  }

  async getTemplates(category) {
    const filter = {};
    if (category) filter.category = category;
    const templates = await DocumentTemplate.find(filter).sort({ name: 1 }).populate('createdBy', 'name email').lean();
    return templates;
  }

  async createDocumentTemplate(userId, data) {
    const template = await DocumentTemplate.create({ ...data, createdBy: userId });
    await logAuditEvent({
      userId, action: 'documents.template.create', category: 'documents',
      entityType: 'DocumentTemplate', entityId: template._id,
      newValue: { name: template.name, category: template.category, outputFormat: template.outputFormat },
      description: `Template "${template.name}" created`,
    });
    return template;
  }

  async generateDocument(userId, templateId, data) {
    const template = await DocumentTemplate.findById(templateId).lean();
    if (!template) throw new Error('Template not found');
    const resolvedContent = JSON.parse(JSON.stringify(template.content));
    const resolveValue = (obj) => {
      if (typeof obj === 'string') {
        return obj.replace(/\{\{(\w+)\}\}/g, (_, key) => data.variables?.[key] !== undefined ? data.variables[key] : `{{${key}}}`);
      }
      if (Array.isArray(obj)) return obj.map(resolveValue);
      if (obj && typeof obj === 'object') {
        const result = {};
        for (const [k, v] of Object.entries(obj)) result[k] = resolveValue(v);
        return result;
      }
      return obj;
    };
    const finalContent = resolveValue(resolvedContent);
    const doc = await Document.create({
      title: data.title || `Generated: ${template.name}`,
      description: template.description,
      tags: template.category ? [template.category] : [],
      type: template.outputFormat === 'pdf' ? 'pdf' : 'doc',
      status: 'draft',
      version: 1,
      metadata: { generatedFrom: templateId, templateName: template.name, variables: data.variables },
      createdBy: userId,
    });
    await logAuditEvent({
      userId, action: 'documents.generate', category: 'documents',
      entityType: 'Document', entityId: doc._id,
      newValue: { template: template.name, title: doc.title },
      description: `Document generated from template "${template.name}"`,
    });
    return { document: doc, content: finalContent };
  }

  async getDocumentComments(docId) {
    const doc = await Document.findById(docId).lean();
    if (!doc) throw new Error('Document not found');
    const comments = await DocumentComment.find({ document: docId }).sort({ createdAt: -1 }).populate('createdBy', 'name email').populate('resolvedBy', 'name email').lean();
    return comments;
  }

  async addDocumentComment(userId, docId, data) {
    const doc = await Document.findById(docId);
    if (!doc) throw new Error('Document not found');
    const comment = await DocumentComment.create({
      document: docId,
      version: data.version,
      content: data.content,
      createdBy: userId,
      mentions: data.mentions || [],
    });
    await logAuditEvent({
      userId, action: 'documents.comment.add', category: 'documents',
      entityType: 'DocumentComment', entityId: comment._id,
      newValue: { documentId: docId, mentionsCount: data.mentions?.length },
      description: `Comment added to "${doc.title}"`,
    });
    return comment;
  }

  async resolveComment(userId, id) {
    const comment = await DocumentComment.findById(id);
    if (!comment) throw new Error('Comment not found');
    if (comment.resolvedAt) throw new Error('Comment is already resolved');
    comment.resolvedAt = new Date();
    comment.resolvedBy = userId;
    await comment.save();
    await logAuditEvent({
      userId, action: 'documents.comment.resolve', category: 'documents',
      entityType: 'DocumentComment', entityId: id,
      newValue: { resolvedAt: comment.resolvedAt },
      description: `Comment ${id} resolved`,
    });
    return comment;
  }

  async approveDocument(userId, docId, data) {
    const doc = await Document.findById(docId);
    if (!doc) throw new Error('Document not found');
    const existing = await DocumentApproval.findOne({ document: docId, approver: userId, status: 'pending' });
    if (existing) {
      existing.status = 'approved';
      existing.comment = data.comment || existing.comment;
      existing.signedAt = new Date();
      await existing.save();
      await logAuditEvent({
        userId, action: 'documents.approve', category: 'documents',
        entityType: 'DocumentApproval', entityId: existing._id,
        newValue: { documentId: docId, status: 'approved' },
        description: `Document "${doc.title}" approved by ${userId}`,
      });
      return existing;
    }
    const approval = await DocumentApproval.create({
      document: docId,
      version: data.version || doc.version,
      status: 'approved',
      approver: userId,
      comment: data.comment,
      signedAt: new Date(),
    });
    await logAuditEvent({
      userId, action: 'documents.approve', category: 'documents',
      entityType: 'DocumentApproval', entityId: approval._id,
      newValue: { documentId: docId, status: 'approved' },
      description: `Document "${doc.title}" approved`,
    });
    return approval;
  }

  async getDocumentsAnalytics() {
    const [totalDocuments, byType, totalVersions, totalComments, storageAgg] = await Promise.all([
      Document.countDocuments({ status: { $ne: 'deleted' } }),
      Document.aggregate([
        { $match: { status: { $ne: 'deleted' } } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      DocumentVersion.countDocuments(),
      DocumentComment.countDocuments(),
      Document.aggregate([
        { $match: { status: { $ne: 'deleted' }, 'file.size': { $exists: true } } },
        { $group: { _id: null, totalStorage: { $sum: '$file.size' } } },
      ]),
    ]);
    const typeBreakdown = {};
    for (const t of byType) typeBreakdown[t._id] = t.count;
    return {
      totalDocuments,
      byType: typeBreakdown,
      totalVersions,
      totalComments,
      totalStorageBytes: storageAgg[0]?.totalStorage || 0,
      totalStorageMB: Math.round(((storageAgg[0]?.totalStorage || 0) / (1024 * 1024)) * 100) / 100,
    };
  }
}

export const enterpriseDocumentsService = new EnterpriseDocumentsService();
