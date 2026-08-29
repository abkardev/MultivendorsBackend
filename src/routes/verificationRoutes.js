import express from 'express';
import { submitVerification, getVerificationStatus, getPendingVerifications, reviewVerification } from '../controllers/verificationController.js';
import { authorize, protect } from '../middlewares/auth.js';

const router = express.Router();

router.post('/verification/submit', protect, authorize('vendor'), submitVerification);
router.get('/verification/status', protect, authorize('vendor'), getVerificationStatus);
router.get('/verification/pending', protect, authorize('admin'), getPendingVerifications);
router.post('/verification/review', protect, authorize('admin'), reviewVerification);

export default router;
