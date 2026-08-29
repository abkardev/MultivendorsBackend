import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { listWarehouses, createWarehouse, updateWarehouse, deleteWarehouse, listCountries, getAllCountries, createCountry, updateCountry, deleteCountry, seedCountries } from '../controllers/warehouseController.js';

const router = Router();
router.get('/warehouses', protect, listWarehouses);
router.post('/warehouses', protect, createWarehouse);
router.put('/warehouses/:id', protect, updateWarehouse);
router.delete('/warehouses/:id', protect, deleteWarehouse);
router.get('/countries', listCountries);
router.get('/countries/all', protect, authorize('admin'), getAllCountries);
router.post('/countries', protect, authorize('admin'), createCountry);
router.put('/countries/:id', protect, authorize('admin'), updateCountry);
router.delete('/countries/:id', protect, authorize('admin'), deleteCountry);
router.post('/countries/seed', protect, authorize('admin'), seedCountries);
export default router;
