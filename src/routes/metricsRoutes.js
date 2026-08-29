import { Router } from 'express';
import metricsCollector from '../services/metrics.js';

const router = Router();

router.get('/metrics', (req, res) => {
  const snapshot = metricsCollector.getSnapshot();
  res.json(snapshot);
});

router.get('/metrics/slow-requests', (req, res) => {
  const { slowRequests } = metricsCollector.getSnapshot();
  res.json(slowRequests);
});

export default router;
