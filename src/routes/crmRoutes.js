import express from 'express';
import { getContacts, getContactById, updateContact, addNote, addInteraction, getCrmStats } from '../controllers/crmController.js';
import { authorize, protect } from '../middlewares/auth.js';

const router = express.Router();

router.get('/crm/contacts', protect, authorize('vendor'), getContacts);
router.get('/crm/contacts/stats', protect, authorize('vendor'), getCrmStats);
router.get('/crm/contacts/:id', protect, authorize('vendor'), getContactById);
router.put('/crm/contacts/:id', protect, authorize('vendor'), updateContact);
router.post('/crm/contacts/:id/notes', protect, authorize('vendor'), addNote);
router.post('/crm/contacts/:id/interactions', protect, authorize('vendor'), addInteraction);

export default router;
