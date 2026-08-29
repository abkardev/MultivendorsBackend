import expressAsyncHandler from "express-async-handler";
import { Product } from "../models/productModel.js"
import { AppError } from "../middlewares/errorHandler.js"
import { sanitizeBody } from "../utils/sanitize.js"
import { paginateResult } from "../utils/pagination.js"
import { isFeatureEnabled } from '../services/featureFlagService.js';
import { rankProducts } from '../services/rankingEngine.js';

const PRODUCT_ALLOWED = [
  'name', 'nameAr', 'description', 'descriptionAr', 'price',
  'images', 'image', 'category', 'brand', 'variations', 'vendor',
  'isActive', 'slug', 'minOrderQuantity', 'unit',
  'moq', 'leadTimeMin', 'leadTimeMax', 'countryOfOrigin',
  'certifications', 'incoterms', 'packaging',
  // Phase 4.2
  'paymentTerms', 'acceptedPaymentMethods', 'acceptedCurrencies', 'minOrderValue', 'priceBreaks',
  'oemAvailable', 'odmAvailable', 'privateLabelService', 'customManufacturing', 'customPackaging', 'designService', 'prototypeService',
  'exportLicenseAvailable', 'mainExportMarkets', 'annualExportRevenueRange', 'nearestShippingPort', 'preferredExportPorts', 'customsDocumentationSupport',
  'dailyProductionCapacity', 'weeklyProductionCapacity', 'monthlyProductionCapacity', 'annualProductionCapacity', 'productionCycle', 'rushOrderSupport',
  'qualityControlProcess', 'thirdPartyInspectionAvailable', 'factoryInspectionAvailable', 'inspectionReports', 'testingEquipment', 'qualityStandards',
  'rdDepartment', 'numberOfEngineers', 'customProductDevelopment', 'newProductDevelopment', 'prototypeDevelopment',
];

// @desc Create a new Product
// @router /api/product/
// @access Private

export const createProduct = expressAsyncHandler(async (req, res) => {
    try{
        const data = sanitizeBody(req.body, PRODUCT_ALLOWED);
        data.vendor = req.user._id;
        const newProduct = await Product.create(data);
        res.status(201).json({ status:true, data: newProduct});

    }catch (error){
        throw new AppError(error,400);
    }
})

// @desc Get All Products
// @router /api/product/
// @access Public

export const getAllProducts = expressAsyncHandler(async (req, res) => {
    try{
        const query = {};
        if (req.query.category) query.category = req.query.category;
        if (req.query.minPrice || req.query.maxPrice) {
            query.price = {};
            if (req.query.minPrice) query.price.$gte = parseFloat(req.query.minPrice);
            if (req.query.maxPrice) query.price.$lte = parseFloat(req.query.maxPrice);
        }
        if (req.query.specs && typeof req.query.specs === 'object') {
          query.$and = Object.entries(req.query.specs).map(([field, values]) => {
            const vals = String(values).split(',').map(v => v.trim()).filter(Boolean);
            return { specifications: { $elemMatch: { field, value: { $in: vals } } } };
          });
        }
        if (req.query.taxonomy) query.taxonomyPath = req.query.taxonomy;
        if (req.query.countryOfOrigin) query.countryOfOrigin = req.query.countryOfOrigin;
        if (req.query.incoterms) query.incoterms = req.query.incoterms;
        if (req.query.maxMoq) {
          const v = parseFloat(req.query.maxMoq);
          if (!isNaN(v)) query.moq = { $lte: v };
        }
        if (req.query.maxLeadTime) {
          const v = parseFloat(req.query.maxLeadTime);
          if (!isNaN(v)) {
            query.$or = [
              ...(query.$or || []),
              { leadTimeMax: { $lte: v } },
              { leadTimeMin: { $lte: v } },
            ];
          }
        }
        if (req.query.oem === 'true') query.oemAvailable = true;
        if (req.query.odm === 'true') query.odmAvailable = true;
        if (req.query.privateLabel === 'true') query.privateLabelService = true;
        if (req.query.exportReady === 'true') query.exportLicenseAvailable = true;
        if (req.query.paymentTerms) query.paymentTerms = { $in: [].concat(req.query.paymentTerms) };
        if (req.query.shippingPort) query.nearestShippingPort = { $regex: req.query.shippingPort, $options: 'i' };
        if (req.query.minProductionCapacity) {
          const v = parseFloat(req.query.minProductionCapacity);
          if (!isNaN(v)) query.monthlyProductionCapacity = { $gte: v };
        }
        if (req.query.qualityStandard) query.qualityStandards = { $in: [].concat(req.query.qualityStandard) };

        const result = await paginateResult(Product, query, {
          page: req.query.page,
          limit: req.query.limit,
          sort: req.query.sort,
          direction: req.query.direction,
          search: req.query.search,
          searchFields: ['name.en', 'name.ar', 'description.en', 'description.ar'],
          populate: { path: 'vendor', select: 'storeName slug storeImage isVerified' },
        });

        if (process.env.FEATURE_REPUTATION_RANKING !== 'false') {
          const ranked = await rankProducts(result.items, { relevanceScore: 0.5 });
          result.items = ranked;
        }

        res.status(200).json({
            status: true,
            data: result.items,
            pagination: {
              page: result.currentPage,
              limit: req.query.limit || 12,
              total: result.totalItems,
              pages: result.totalPages,
            }
        });

    }catch (error){
        throw new AppError(error,400);
    }
})

// @desc Get a Product By Slug
// @router /api/product/:slug
// @access Public

export const getAProductBySlug = expressAsyncHandler(async (req, res) => {
    try{
        const product = await Product.findOne({slug: req.params.slug});
        if(!product){
            throw new AppError("Product Not Found!", 404);
        }
        res.status(200).json({ status:true, data: product});

    }catch (error){
        throw new AppError(error,400);
    }
})

// @desc Get a Product By ID
// @router /api/product/id/:id
// @access Public

export const getProductById = expressAsyncHandler(async (req, res) => {
    try{
        const product = await Product.findById(req.params.id).populate('vendor', 'storeName storeImage slug user');
        if(!product){
            throw new AppError("Product Not Found!", 404);
        }
        res.status(200).json({ status:true, data: product});
    }catch (error){
        throw new AppError(error,400);
    }
})

// @desc Update a Product
// @router /api/product/:id
// @access Private

export const updateAProduct = expressAsyncHandler(async (req, res) => {
    try{
        const data = sanitizeBody(req.body, PRODUCT_ALLOWED);
        const product = await Product.findOneAndUpdate(
            { _id: req.params.id, vendor: req.user._id },
            data,
            { new: true }
        );
        if(!product){
            throw new AppError("Product Not Found!", 404);
        }
        res.status(200).json({ status:true, data: product});

    }catch (error){
        throw new AppError(error,400);
    }
})

// @desc Delete a Product
// @router /api/product/:id
// @access Private

export const deleteAProduct = expressAsyncHandler(async (req, res) => {
    try{
        const product = await Product.findOneAndDelete(
            { _id: req.params.id, vendor: req.user._id }
        );
        if(!product){
            throw new AppError("Product Not Found!", 404);
        }
        res.status(200).json({ status:true, message: "Product Deleted Successfully"});

    }catch (error){
        throw new AppError(error,400);
    }
})