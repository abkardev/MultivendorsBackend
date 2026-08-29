import { Router } from 'express';
import { Announcement } from '../models/announcementModel.js';
import { Vendor } from '../models/vendorModel.js';
import { rankVendorsForRfq } from '../services/rankingEngine.js';
import { generateVendorTrustInsights } from '../services/aiTrustInsightsService.js';
import { getLogger } from '../services/logger.js';
import { protect } from '../middlewares/authMiddleware.js';
import { paginateResult } from '../utils/pagination.js';
import { AppError } from '../middlewares/errorHandler.js';

const router = Router();

router.get('/rfq/:id/matching-vendors', protect, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) throw new AppError('RFQ not found', 404);

    const vendors = await Vendor.find({ isActive: true, isVerified: true }).lean();
    const context = {
      category: announcement.category,
      country: announcement.country,
      industry: announcement.industry,
    };

    const ranked = await rankVendorsForRfq(vendors, context);
    const topVendors = ranked.slice(0, 20);

    const withInsights = await Promise.all(
      topVendors.slice(0, 5).map(async (v) => {
        const insights = await generateVendorTrustInsights(v._id);
        return { ...v, trustInsights: insights };
      })
    );

    res.json({
      status: true,
      data: withInsights,
      total: topVendors.length,
      recommendations: ranked.slice(0, 10).map(v => ({
        vendorId: v._id,
        score: v._rfqScore,
        reasons: v._rfqReasons,
      })),
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

router.get('/procurement/supplier-recommendations', protect, async (req, res) => {
  try {
    const { industry, country } = req.query;
    const query = { isActive: true, isVerified: true };
    if (industry) query.industry = industry;

    const result = await paginateResult(Vendor, query, {
      page: req.query.page,
      limit: req.query.limit || 20,
      sort: 'createdAt',
      direction: 'desc',
    });

    const ranked = await rankVendorsForRfq(result.items, { category: industry, country });

    res.json({
      status: true,
      data: ranked,
      pagination: {
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        hasNextPage: result.hasNextPage,
        hasPreviousPage: result.hasPreviousPage,
      },
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

export default router;
