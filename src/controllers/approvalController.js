import { ApprovalWorkflow, ApprovalRequest } from '../models/ApprovalWorkflow.js';
import { sanitizeBody } from '../utils/sanitize.js';

const ALLOWED_FIELDS = ['type', 'title', 'description', 'requestedBy', 'assignedTo', 'priority', 'dueDate', 'metadata', 'attachments'];

export const listWorkflows = async (req, res) => {
  try {
    const workflows = await ApprovalWorkflow.find({}).sort({ createdAt: -1 });
    res.json({ status: true, data: workflows });
  } catch (error) { res.status(500).json({ status: false, message: error.message }); }
};

export const createWorkflow = async (req, res) => {
  try {
    const workflow = await ApprovalWorkflow.create(sanitizeBody(req.body, ALLOWED_FIELDS));
    res.status(201).json({ status: true, data: workflow });
  } catch (error) { res.status(500).json({ status: false, message: error.message }); }
};

export const updateWorkflow = async (req, res) => {
  try {
    const workflow = await ApprovalWorkflow.findByIdAndUpdate(req.params.id, sanitizeBody(req.body, ALLOWED_FIELDS), { new: true });
    if (!workflow) return res.status(404).json({ status: false, message: 'Workflow not found' });
    res.json({ status: true, data: workflow });
  } catch (error) { res.status(500).json({ status: false, message: error.message }); }
};

export const deleteWorkflow = async (req, res) => {
  try {
    await ApprovalWorkflow.findByIdAndDelete(req.params.id);
    res.json({ status: true, message: 'Workflow deleted' });
  } catch (error) { res.status(500).json({ status: false, message: error.message }); }
};

export const listApprovalRequests = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, resourceType } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (resourceType) filter.resourceType = resourceType;
    if (req.user.role !== 'admin') filter.requester = req.user._id;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [requests, total] = await Promise.all([
      ApprovalRequest.find(filter).populate('requester', 'name email').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      ApprovalRequest.countDocuments(filter),
    ]);
    res.json({ status: true, data: requests, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) { res.status(500).json({ status: false, message: error.message }); }
};

export const getApprovalRequest = async (req, res) => {
  try {
    const request = await ApprovalRequest.findById(req.params.id).populate('requester', 'name email').populate('steps.actedBy', 'name');
    if (!request) return res.status(404).json({ status: false, message: 'Request not found' });
    res.json({ status: true, data: request });
  } catch (error) { res.status(500).json({ status: false, message: error.message }); }
};

export const createApprovalRequest = async (req, res) => {
  try {
    const { workflowId, resourceType, resourceId, title, description, priority, metadata } = req.body;
    let steps = [];
    if (workflowId) {
      const workflow = await ApprovalWorkflow.findById(workflowId);
      if (workflow) steps = workflow.steps.map(s => ({ ...s.toObject(), status: 'pending' }));
    }
    const request = await ApprovalRequest.create({
      workflow: workflowId, resourceType, resourceId, requester: req.user._id,
      title, description, priority, metadata, steps, status: steps.length > 0 ? 'in_progress' : 'pending',
    });
    res.status(201).json({ status: true, data: request });
  } catch (error) { res.status(500).json({ status: false, message: error.message }); }
};

export const approveStep = async (req, res) => {
  try {
    const { comment } = req.body;
    const request = await ApprovalRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ status: false, message: 'Request not found' });
    const step = request.steps[request.currentStep];
    if (!step) return res.status(400).json({ status: false, message: 'No pending step' });
    step.status = 'approved';
    step.actedBy = req.user._id;
    step.actedAt = new Date();
    step.comment = comment;
    if (request.currentStep >= request.steps.length - 1) {
      request.status = 'approved';
      request.completedAt = new Date();
    } else {
      request.currentStep += 1;
    }
    await request.save();
    res.json({ status: true, data: request });
  } catch (error) { res.status(500).json({ status: false, message: error.message }); }
};

export const rejectStep = async (req, res) => {
  try {
    const { comment } = req.body;
    const request = await ApprovalRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ status: false, message: 'Request not found' });
    const step = request.steps[request.currentStep];
    if (!step) return res.status(400).json({ status: false, message: 'No pending step' });
    step.status = 'rejected';
    step.actedBy = req.user._id;
    step.actedAt = new Date();
    step.comment = comment;
    request.status = 'rejected';
    request.completedAt = new Date();
    await request.save();
    res.json({ status: true, data: request });
  } catch (error) { res.status(500).json({ status: false, message: error.message }); }
};

export const cancelApprovalRequest = async (req, res) => {
  try {
    const request = await ApprovalRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ status: false, message: 'Request not found' });
    if (request.requester.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ status: false, message: 'Access denied' });
    }
    request.status = 'cancelled';
    request.completedAt = new Date();
    await request.save();
    res.json({ status: true, data: request });
  } catch (error) { res.status(500).json({ status: false, message: error.message }); }
};
