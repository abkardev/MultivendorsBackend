import express from 'express';
import { aiSearch } from '../controllers/aiSearchController.js';

const aiSearchRouter = express.Router();

// Public — buyers don't need to be logged in to search
aiSearchRouter.post('/ai', aiSearch);

export default aiSearchRouter;
