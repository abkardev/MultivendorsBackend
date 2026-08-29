import { enterpriseSchedulerService } from '../services/enterpriseSchedulerService.js';

export const registerJob = async (req, res) => {
  try {
    const job = await enterpriseSchedulerService.registerJob(req.body, req.user._id);
    res.status(201).json({ status: true, data: job });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateJob = async (req, res) => {
  try {
    const job = await enterpriseSchedulerService.updateJob(req.params.id, req.body, req.user._id);
    if (!job) return res.status(404).json({ status: false, message: 'Job not found' });
    res.json({ status: true, data: job });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const listJobs = async (req, res) => {
  try {
    const result = await enterpriseSchedulerService.listJobs(req.query);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getJob = async (req, res) => {
  try {
    const job = await enterpriseSchedulerService.getJob(req.params.id);
    if (!job) return res.status(404).json({ status: false, message: 'Job not found' });
    res.json({ status: true, data: job });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const pauseJob = async (req, res) => {
  try {
    const job = await enterpriseSchedulerService.pauseJob(req.params.id, req.user._id, req.body.reason);
    res.json({ status: true, data: job });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const resumeJob = async (req, res) => {
  try {
    const job = await enterpriseSchedulerService.resumeJob(req.params.id, req.user._id);
    res.json({ status: true, data: job });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const executeJobManually = async (req, res) => {
  try {
    const execution = await enterpriseSchedulerService.executeJobManually(req.params.id, req.user._id);
    res.json({ status: true, data: execution });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getExecutions = async (req, res) => {
  try {
    const result = await enterpriseSchedulerService.getExecutions(req.params.id, req.query);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getQueueStats = async (req, res) => {
  try {
    const stats = await enterpriseSchedulerService.getQueueStats();
    res.json({ status: true, data: stats });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getDependencyGraph = async (req, res) => {
  try {
    const graph = await enterpriseSchedulerService.getDependencyGraph();
    res.json({ status: true, data: graph });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const retryFailedExecution = async (req, res) => {
  try {
    const execution = await enterpriseSchedulerService.retryFailedExecution(req.params.executionId);
    res.json({ status: true, data: execution });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};
