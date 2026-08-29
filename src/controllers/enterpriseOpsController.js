import { marketplaceAdminService } from '../services/marketplaceAdminService.js';
import { financialAdminService } from '../services/financialAdminService.js';
import { subscriptionBillingService } from '../services/subscriptionBillingService.js';
import { complianceEngine as complianceService } from '../services/complianceService.js';
import { fraudDetectionService } from '../services/fraudDetectionService.js';
import { moderationService } from '../services/moderationService.js';
import { governanceService } from '../services/governanceService.js';
import { marketplaceAnalyticsService } from '../services/marketplaceAnalyticsService.js';
import { aiMarketplaceManagerService } from '../services/aiMarketplaceManagerService.js';
import { enterpriseNotificationService } from '../services/enterpriseNotificationService.js';
import { searchAdminService } from '../services/searchAdminService.js';
import { enterpriseAuditCenterService } from '../services/enterpriseAuditCenterService.js';
import { operationsCenterService } from '../services/operationsCenterService.js';
import { securityCenterService } from '../services/securityCenterService.js';
import { configurationService } from '../services/configurationService.js';
import { tenantService } from '../services/tenantService.js';
import { logAuditEvent } from '../services/auditService.js';

// ─── Marketplace Administration ───

export const getDashboard = async (req, res) => {
  try {
    const result = await marketplaceAdminService.getDashboard();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getCompanies = async (req, res) => {
  try {
    const result = await marketplaceAdminService.getCompanies(req.query);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getCompany = async (req, res) => {
  try {
    const result = await marketplaceAdminService.getCompany(req.params.id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createCompany = async (req, res) => {
  try {
    const result = await marketplaceAdminService.createCompany(req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateCompany = async (req, res) => {
  try {
    const result = await marketplaceAdminService.updateCompany(req.params.id, req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteCompany = async (req, res) => {
  try {
    const result = await marketplaceAdminService.deleteCompany(req.params.id, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const restoreCompany = async (req, res) => {
  try {
    const result = await marketplaceAdminService.restoreCompany(req.params.id, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const bulkActionCompanies = async (req, res) => {
  try {
    const result = await marketplaceAdminService.bulkAction(req.body.ids, req.body.action, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getPlatformStats = async (req, res) => {
  try {
    const result = await marketplaceAdminService.getStats();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getCountries = async (req, res) => {
  try {
    const result = await marketplaceAdminService.getCountries();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createCountry = async (req, res) => {
  try {
    const result = await marketplaceAdminService.createCountry(req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateCountry = async (req, res) => {
  try {
    const result = await marketplaceAdminService.updateCountry(req.params.id, req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteCountry = async (req, res) => {
  try {
    const result = await marketplaceAdminService.deleteCountry(req.params.id, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getCities = async (req, res) => {
  try {
    const result = await marketplaceAdminService.getCities(req.query.country);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createCity = async (req, res) => {
  try {
    const result = await marketplaceAdminService.createCity(req.body.country, req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateCity = async (req, res) => {
  try {
    const result = await marketplaceAdminService.updateCity(req.params.country, req.params.cityId, req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteCity = async (req, res) => {
  try {
    const result = await marketplaceAdminService.deleteCity(req.params.country, req.params.cityId, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getCurrencies = async (req, res) => {
  try {
    const result = await marketplaceAdminService.getCurrencies();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createCurrency = async (req, res) => {
  try {
    const result = await marketplaceAdminService.createCurrency(req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateCurrency = async (req, res) => {
  try {
    const result = await marketplaceAdminService.updateCurrency(req.params.code, req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getLanguages = async (req, res) => {
  try {
    const result = await marketplaceAdminService.getLanguages();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createLanguage = async (req, res) => {
  try {
    const result = await marketplaceAdminService.createLanguage(req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getIndustries = async (req, res) => {
  try {
    const result = await marketplaceAdminService.getIndustries();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createIndustry = async (req, res) => {
  try {
    const result = await marketplaceAdminService.createIndustry(req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getTaxRules = async (req, res) => {
  try {
    const result = await marketplaceAdminService.getTaxRules();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createTaxRule = async (req, res) => {
  try {
    const result = await marketplaceAdminService.createTaxRule(req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateTaxRule = async (req, res) => {
  try {
    const result = await marketplaceAdminService.updateTaxRule(req.params.id, req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteTaxRule = async (req, res) => {
  try {
    const result = await marketplaceAdminService.deleteTaxRule(req.params.id, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getIncoterms = async (req, res) => {
  try {
    const result = await marketplaceAdminService.getIncoterms();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createIncoterm = async (req, res) => {
  try {
    const result = await marketplaceAdminService.createIncoterm(req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateIncoterm = async (req, res) => {
  try {
    const result = await marketplaceAdminService.updateIncoterm(req.params.id, req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getDepartments = async (req, res) => {
  try {
    const result = await marketplaceAdminService.getDepartments();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createDepartment = async (req, res) => {
  try {
    const result = await marketplaceAdminService.createDepartment(req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateDepartment = async (req, res) => {
  try {
    const result = await marketplaceAdminService.updateDepartment(req.params.id, req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteDepartment = async (req, res) => {
  try {
    const result = await marketplaceAdminService.deleteDepartment(req.params.id, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getTeams = async (req, res) => {
  try {
    const result = await marketplaceAdminService.getTeams();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createTeam = async (req, res) => {
  try {
    const result = await marketplaceAdminService.createTeam(req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateTeam = async (req, res) => {
  try {
    const result = await marketplaceAdminService.updateTeam(req.params.id, req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteTeam = async (req, res) => {
  try {
    const result = await marketplaceAdminService.deleteTeam(req.params.id, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getMarketplaceSettings = async (req, res) => {
  try {
    const result = await marketplaceAdminService.getSettings();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateMarketplaceSetting = async (req, res) => {
  try {
    const result = await marketplaceAdminService.updateSetting(req.params.key, req.body.value, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getAnnouncements = async (req, res) => {
  try {
    const result = await marketplaceAdminService.getAnnouncements();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createAnnouncement = async (req, res) => {
  try {
    const result = await marketplaceAdminService.createAnnouncement(req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateAnnouncement = async (req, res) => {
  try {
    const result = await marketplaceAdminService.updateAnnouncement(req.params.id, req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteAnnouncement = async (req, res) => {
  try {
    const result = await marketplaceAdminService.deleteAnnouncement(req.params.id, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const toggleMaintenanceMode = async (req, res) => {
  try {
    const result = await marketplaceAdminService.toggleMaintenanceMode(req.body.enabled, req.body.message, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const searchEntities = async (req, res) => {
  try {
    const result = await marketplaceAdminService.search(req.query.q, req.query);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const exportCsv = async (req, res) => {
  try {
    const result = await marketplaceAdminService.exportCsv(req.query.entityType, req.query);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const importCsv = async (req, res) => {
  try {
    const result = await marketplaceAdminService.importCsv(req.body.entityType, req.body.records, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ─── Financial Administration ───

export const getFinancialDashboard = async (req, res) => {
  try {
    const result = await financialAdminService.getFinancialDashboard();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getRevenue = async (req, res) => {
  try {
    const result = await financialAdminService.getRevenue(req.query);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getRevenueByPeriod = async (req, res) => {
  try {
    const result = await financialAdminService.getRevenueByPeriod(req.query.type, req.query.startDate, req.query.endDate);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getRevenueForecast = async (req, res) => {
  try {
    const result = await financialAdminService.getRevenueForecast();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSettlements = async (req, res) => {
  try {
    const result = await financialAdminService.getSettlements(req.query);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSettlement = async (req, res) => {
  try {
    const result = await financialAdminService.getSettlement(req.params.id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const approveSettlement = async (req, res) => {
  try {
    const result = await financialAdminService.approveSettlement(req.params.id, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const processSettlement = async (req, res) => {
  try {
    const result = await financialAdminService.processSettlement(req.params.id, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getPayoutQueue = async (req, res) => {
  try {
    const result = await financialAdminService.getPayoutQueue();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getRefunds = async (req, res) => {
  try {
    const result = await financialAdminService.getRefunds(req.query);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const processRefund = async (req, res) => {
  try {
    const result = await financialAdminService.processRefund(req.params.id, req.body.status, req.body.notes, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createRefund = async (req, res) => {
  try {
    const result = await financialAdminService.createRefund(req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getCreditNotes = async (req, res) => {
  try {
    const result = await financialAdminService.getCreditNotes(req.query);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createCreditNote = async (req, res) => {
  try {
    const result = await financialAdminService.createCreditNote(req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const voidCreditNote = async (req, res) => {
  try {
    const result = await financialAdminService.voidCreditNote(req.params.id, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getDebitNotes = async (req, res) => {
  try {
    const result = await financialAdminService.getDebitNotes(req.query);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createDebitNote = async (req, res) => {
  try {
    const result = await financialAdminService.createDebitNote(req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const voidDebitNote = async (req, res) => {
  try {
    const result = await financialAdminService.voidDebitNote(req.params.id, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getInvoices = async (req, res) => {
  try {
    const result = await financialAdminService.getInvoices(req.query);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getInvoice = async (req, res) => {
  try {
    const result = await financialAdminService.getInvoice(req.params.id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createInvoice = async (req, res) => {
  try {
    const result = await financialAdminService.createInvoice(req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const sendInvoice = async (req, res) => {
  try {
    const result = await financialAdminService.sendInvoice(req.params.id, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getTaxReports = async (req, res) => {
  try {
    const result = await financialAdminService.getTaxReports(req.query.startDate, req.query.endDate);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getCashFlow = async (req, res) => {
  try {
    const result = await financialAdminService.getCashFlow(req.query.startDate, req.query.endDate);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getOutstandingPayments = async (req, res) => {
  try {
    const result = await financialAdminService.getOutstandingPayments();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getFinancialKpis = async (req, res) => {
  try {
    const result = await financialAdminService.getFinancialKpis();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ─── Subscription & Billing ───

export const getPlans = async (req, res) => {
  try {
    const result = await subscriptionBillingService.getPlans();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getPlan = async (req, res) => {
  try {
    const result = await subscriptionBillingService.getPlan(req.params.id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createPlan = async (req, res) => {
  try {
    const result = await subscriptionBillingService.createPlan(req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updatePlan = async (req, res) => {
  try {
    const result = await subscriptionBillingService.updatePlan(req.params.id, req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deletePlan = async (req, res) => {
  try {
    const result = await subscriptionBillingService.deletePlan(req.params.id, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getCoupons = async (req, res) => {
  try {
    const result = await subscriptionBillingService.getCoupons();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createCoupon = async (req, res) => {
  try {
    const result = await subscriptionBillingService.createCoupon(req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const validateCoupon = async (req, res) => {
  try {
    const result = await subscriptionBillingService.validateCoupon(req.query.code, req.query.planId);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getUsageRecords = async (req, res) => {
  try {
    const result = await subscriptionBillingService.getUsageRecords(req.query.vendorId);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getUsageAnalytics = async (req, res) => {
  try {
    const result = await subscriptionBillingService.getUsageAnalytics();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getBillingHistory = async (req, res) => {
  try {
    const result = await subscriptionBillingService.getBillingHistory(req.query.vendorId);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSubscriptionForecast = async (req, res) => {
  try {
    const result = await subscriptionBillingService.getSubscriptionForecast();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const upgradePlan = async (req, res) => {
  try {
    const result = await subscriptionBillingService.processUpgrade(req.body.vendorId, req.body.newPlanId, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const downgradePlan = async (req, res) => {
  try {
    const result = await subscriptionBillingService.processDowngrade(req.body.vendorId, req.body.newPlanId, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const cancelSubscription = async (req, res) => {
  try {
    const result = await subscriptionBillingService.processCancellation(req.body.vendorId, req.body.reason, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const suspendSubscription = async (req, res) => {
  try {
    const result = await subscriptionBillingService.processSuspension(req.body.vendorId, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const autoRenew = async (req, res) => {
  try {
    const result = await subscriptionBillingService.autoRenew(req.body.vendorId);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSubscriptionStats = async (req, res) => {
  try {
    const result = await subscriptionBillingService.getSubscriptionStats();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ─── Compliance & Verification ───

export const getVerificationRequests = async (req, res) => {
  try {
    const result = await complianceService.getVerificationRequests(req.query);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getVerificationRequest = async (req, res) => {
  try {
    const result = await complianceService.getVerificationRequest(req.params.id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createVerificationRequest = async (req, res) => {
  try {
    const result = await complianceService.createVerificationRequest(req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const assignVerification = async (req, res) => {
  try {
    const result = await complianceService.assignVerification(req.params.id, req.body.userId, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const approveVerification = async (req, res) => {
  try {
    const result = await complianceService.approveVerification(req.params.id, req.body.notes, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const rejectVerification = async (req, res) => {
  try {
    const result = await complianceService.rejectVerification(req.params.id, req.body.notes, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getComplianceRules = async (req, res) => {
  try {
    const result = await complianceService.getComplianceRules();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createComplianceRule = async (req, res) => {
  try {
    const result = await complianceService.createComplianceRule(req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateComplianceRule = async (req, res) => {
  try {
    const result = await complianceService.updateComplianceRule(req.params.id, req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteComplianceRule = async (req, res) => {
  try {
    const result = await complianceService.deleteComplianceRule(req.params.id, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const checkCompliance = async (req, res) => {
  try {
    const result = await complianceService.checkCompliance(req.query.entityType, req.query.entityId);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getCertificates = async (req, res) => {
  try {
    const result = await complianceService.getCertificates(req.query);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createCertificate = async (req, res) => {
  try {
    const result = await complianceService.createCertificate(req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const verifyCertificate = async (req, res) => {
  try {
    const result = await complianceService.verifyCertificate(req.params.id, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getComplianceDashboard = async (req, res) => {
  try {
    const result = await complianceService.getComplianceDashboard();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getVerificationTimeline = async (req, res) => {
  try {
    const result = await complianceService.getVerificationTimeline(req.params.id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const addToBlacklist = async (req, res) => {
  try {
    const result = await complianceService.addToBlacklist(req.body.entityType, req.body.entityId, req.body.reason, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const removeFromBlacklist = async (req, res) => {
  try {
    const result = await complianceService.removeFromBlacklist(req.params.entityType, req.params.entityId, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getVerificationAnalytics = async (req, res) => {
  try {
    const result = await complianceService.getVerificationAnalytics();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ─── Fraud Detection ───

export const getFraudDashboard = async (req, res) => {
  try {
    const result = await fraudDetectionService.getFraudDashboard();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getFraudAlerts = async (req, res) => {
  try {
    const result = await fraudDetectionService.getAlerts(req.query);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getFraudAlert = async (req, res) => {
  try {
    const result = await fraudDetectionService.getAlert(req.params.id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const investigateAlert = async (req, res) => {
  try {
    const result = await fraudDetectionService.investigateAlert(req.params.id, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const resolveAlert = async (req, res) => {
  try {
    const result = await fraudDetectionService.resolveAlert(req.params.id, req.body.resolution, req.body.status);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const detectDuplicateAccounts = async (req, res) => {
  try {
    const result = await fraudDetectionService.detectDuplicateAccounts(req.params.userId);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const detectDuplicateCompanies = async (req, res) => {
  try {
    const result = await fraudDetectionService.detectDuplicateCompanies(req.body.companyName);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const analyzeSuspiciousOrder = async (req, res) => {
  try {
    const result = await fraudDetectionService.analyzeSuspiciousOrder(req.params.orderId);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const analyzeSuspiciousReview = async (req, res) => {
  try {
    const result = await fraudDetectionService.analyzeSuspiciousReview(req.params.reviewId);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const detectBotActivity = async (req, res) => {
  try {
    const result = await fraudDetectionService.detectBotActivity(req.body.ip);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const checkIpReputation = async (req, res) => {
  try {
    const result = await fraudDetectionService.checkIpReputation(req.query.ip);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const blockIpAlert = async (req, res) => {
  try {
    const result = await fraudDetectionService.blockIp(req.body.ip, req.body.reason);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const unblockIpAlert = async (req, res) => {
  try {
    const result = await fraudDetectionService.unblockIp(req.params.ip);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getFraudRules = async (req, res) => {
  try {
    const result = await fraudDetectionService.getFraudRules();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createFraudRule = async (req, res) => {
  try {
    const result = await fraudDetectionService.createFraudRule(req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateFraudRule = async (req, res) => {
  try {
    const result = await fraudDetectionService.updateFraudRule(req.params.id, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const toggleFraudRule = async (req, res) => {
  try {
    const result = await fraudDetectionService.toggleFraudRule(req.params.id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const runFraudRule = async (req, res) => {
  try {
    const result = await fraudDetectionService.runRule(req.params.id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getRiskScore = async (req, res) => {
  try {
    const result = await fraudDetectionService.getRiskScore(req.params.userId);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getDeviceFingerprint = async (req, res) => {
  try {
    const result = await fraudDetectionService.getDeviceFingerprint(req.query.fingerprint);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const registerDevice = async (req, res) => {
  try {
    const result = await fraudDetectionService.registerDevice(req.body.fingerprint, req.user?._id, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getInvestigationQueue = async (req, res) => {
  try {
    const result = await fraudDetectionService.getInvestigationQueue();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ─── Content Moderation ───

export const getModerationDashboard = async (req, res) => {
  try {
    const result = await moderationService.getModerationDashboard();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getModerationQueue = async (req, res) => {
  try {
    const result = await moderationService.getQueue(req.query);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getModerationQueueItem = async (req, res) => {
  try {
    const result = await moderationService.getQueueItem(req.params.id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const reportContent = async (req, res) => {
  try {
    const result = await moderationService.reportContent(req.body.entityType, req.body.entityId, req.body.reason, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const assignModeration = async (req, res) => {
  try {
    const result = await moderationService.assignModeration(req.params.id, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const approveContent = async (req, res) => {
  try {
    const result = await moderationService.approveContent(req.params.id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const rejectContent = async (req, res) => {
  try {
    const result = await moderationService.rejectContent(req.params.id, req.body.reason);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const escalateContent = async (req, res) => {
  try {
    const result = await moderationService.escalateContent(req.params.id, req.body.reason);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const bulkModerate = async (req, res) => {
  try {
    const result = await moderationService.bulkModerate(req.body.ids, req.body.action);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getModerationRules = async (req, res) => {
  try {
    const result = await moderationService.getModerationRules();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createModerationRule = async (req, res) => {
  try {
    const result = await moderationService.createModerationRule(req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateModerationRule = async (req, res) => {
  try {
    const result = await moderationService.updateModerationRule(req.params.id, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteModerationRule = async (req, res) => {
  try {
    const result = await moderationService.deleteModerationRule(req.params.id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const checkModerationContent = async (req, res) => {
  try {
    const result = await moderationService.checkContent(req.body.text);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const detectContentDuplicates = async (req, res) => {
  try {
    const result = await moderationService.detectDuplicates(req.body.entityType, req.body.content);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getBlockedContent = async (req, res) => {
  try {
    const result = await moderationService.getBlockedContent();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const addBlockedContent = async (req, res) => {
  try {
    const result = await moderationService.addBlockedContent(req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const removeBlockedContent = async (req, res) => {
  try {
    const result = await moderationService.removeBlockedContent(req.params.id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const aiModerateContent = async (req, res) => {
  try {
    const result = await moderationService.aiModerate(req.body.content, req.body.entityType);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ─── Governance ───

export const getGovernanceDashboard = async (req, res) => {
  try {
    const result = await governanceService.getGovernanceDashboard();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getPolicies = async (req, res) => {
  try {
    const result = await governanceService.getPolicies(req.query);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getPolicy = async (req, res) => {
  try {
    const result = await governanceService.getPolicy(req.params.id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createPolicy = async (req, res) => {
  try {
    const result = await governanceService.createPolicy(req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updatePolicy = async (req, res) => {
  try {
    const result = await governanceService.updatePolicy(req.params.id, req.body, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const archivePolicy = async (req, res) => {
  try {
    const result = await governanceService.archivePolicy(req.params.id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const approvePolicy = async (req, res) => {
  try {
    const result = await governanceService.approvePolicy(req.params.id, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getPolicyVersions = async (req, res) => {
  try {
    const result = await governanceService.getPolicyVersions(req.params.id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getApprovalMatrices = async (req, res) => {
  try {
    const result = await governanceService.getApprovalMatrices();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createApprovalMatrix = async (req, res) => {
  try {
    const result = await governanceService.createApprovalMatrix(req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateApprovalMatrix = async (req, res) => {
  try {
    const result = await governanceService.updateApprovalMatrix(req.params.id, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteApprovalMatrix = async (req, res) => {
  try {
    const result = await governanceService.deleteApprovalMatrix(req.params.id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const checkApprovalRequired = async (req, res) => {
  try {
    const result = await governanceService.checkApprovalRequired(req.body.entityType, req.body.entity, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getGovernanceAudit = async (req, res) => {
  try {
    const result = await governanceService.getGovernanceAudit(req.query);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSlaSummary = async (req, res) => {
  try {
    const result = await governanceService.getSlaSummary();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ─── Marketplace Analytics ───

export const getMarketplaceOverview = async (req, res) => {
  try {
    const result = await marketplaceAnalyticsService.getMarketplaceOverview(req.query.startDate, req.query.endDate);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getGmv = async (req, res) => {
  try {
    const result = await marketplaceAnalyticsService.getGmv(req.query.startDate, req.query.endDate, req.query.groupBy);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getRevenueAnalytics = async (req, res) => {
  try {
    const result = await marketplaceAnalyticsService.getRevenueAnalytics(req.query.startDate, req.query.endDate);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getOrderAnalytics = async (req, res) => {
  try {
    const result = await marketplaceAnalyticsService.getOrderAnalytics(req.query.startDate, req.query.endDate);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getBuyerAnalytics = async (req, res) => {
  try {
    const result = await marketplaceAnalyticsService.getBuyerAnalytics(req.query.startDate, req.query.endDate);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSupplierAnalytics = async (req, res) => {
  try {
    const result = await marketplaceAnalyticsService.getSupplierAnalytics(req.query.startDate, req.query.endDate);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getConversionFunnel = async (req, res) => {
  try {
    const result = await marketplaceAnalyticsService.getConversionFunnel();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getCountryAnalytics = async (req, res) => {
  try {
    const result = await marketplaceAnalyticsService.getCountryAnalytics();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getIndustryAnalytics = async (req, res) => {
  try {
    const result = await marketplaceAnalyticsService.getIndustryAnalytics();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getCategoryAnalytics = async (req, res) => {
  try {
    const result = await marketplaceAnalyticsService.getCategoryAnalytics();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSubscriptionAnalytics = async (req, res) => {
  try {
    const result = await marketplaceAnalyticsService.getSubscriptionAnalytics();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getGrowthMetrics = async (req, res) => {
  try {
    const result = await marketplaceAnalyticsService.getGrowthMetrics();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getRetentionRate = async (req, res) => {
  try {
    const result = await marketplaceAnalyticsService.getRetentionRate();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getChurnRate = async (req, res) => {
  try {
    const result = await marketplaceAnalyticsService.getChurnRate();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getCustomerLifetimeValue = async (req, res) => {
  try {
    const result = await marketplaceAnalyticsService.getCustomerLifetimeValue();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getCustomerAcquisitionCost = async (req, res) => {
  try {
    const result = await marketplaceAnalyticsService.getCustomerAcquisitionCost();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSearchAnalyticsAdmin = async (req, res) => {
  try {
    const result = await marketplaceAnalyticsService.getSearchAnalytics();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getFeatureAdoption = async (req, res) => {
  try {
    const result = await marketplaceAnalyticsService.getFeatureAdoption();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getMarketplaceTrends = async (req, res) => {
  try {
    const result = await marketplaceAnalyticsService.getMarketplaceTrends();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getForecasts = async (req, res) => {
  try {
    const result = await marketplaceAnalyticsService.getForecasts(req.query.metric, req.query.period);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getExecutiveReport = async (req, res) => {
  try {
    const result = await marketplaceAnalyticsService.getExecutiveReport(req.query.startDate, req.query.endDate);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ─── AI Marketplace Manager ───

export const processAiMarketplaceQuery = async (req, res) => {
  try {
    const result = await aiMarketplaceManagerService.processQuery(req.body.query, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ─── Enterprise Notifications ───

export const sendEmailNotification = async (req, res) => {
  try {
    const result = await enterpriseNotificationService.sendEmail(req.body.recipient, req.body.template, req.body.data);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const sendSmsNotification = async (req, res) => {
  try {
    const result = await enterpriseNotificationService.sendSms(req.body.recipient, req.body.message);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const sendWhatsAppNotification = async (req, res) => {
  try {
    const result = await enterpriseNotificationService.sendWhatsApp(req.body.recipient, req.body.template, req.body.data);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const sendPushNotification = async (req, res) => {
  try {
    const result = await enterpriseNotificationService.sendPush(req.body.userId, req.body.title, req.body.body, req.body.data);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const sendSlackNotification = async (req, res) => {
  try {
    const result = await enterpriseNotificationService.sendSlack(req.body.webhookUrl, req.body.message);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const sendWebhookNotification = async (req, res) => {
  try {
    const result = await enterpriseNotificationService.sendWebhook(req.body.url, req.body.event, req.body.payload);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const scheduleNotificationDelivery = async (req, res) => {
  try {
    const result = await enterpriseNotificationService.scheduleNotification(req.body.recipient, req.body.template, req.body.data, req.body.scheduledAt);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const sendDigestNotification = async (req, res) => {
  try {
    const result = await enterpriseNotificationService.sendDigest(req.body.userId, req.body.period);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createNotificationCampaign = async (req, res) => {
  try {
    const result = await enterpriseNotificationService.createCampaign(req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const sendNotificationCampaign = async (req, res) => {
  try {
    const result = await enterpriseNotificationService.sendCampaign(req.params.id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getNotificationAnalyticsAdmin = async (req, res) => {
  try {
    const result = await enterpriseNotificationService.getNotificationAnalytics(req.query);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getNotificationQueue = async (req, res) => {
  try {
    const result = await enterpriseNotificationService.getQueue();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const retryFailedNotification = async (req, res) => {
  try {
    const result = await enterpriseNotificationService.retryFailed(req.params.id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ─── Search Administration ───

export const getSearchAnalyticsAdminSM = async (req, res) => {
  try {
    const result = await searchAdminService.getSearchAnalytics();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getPopularSearchesAdmin = async (req, res) => {
  try {
    const result = await searchAdminService.getPopularSearches(req.query.limit);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getFailedSearchesAdmin = async (req, res) => {
  try {
    const result = await searchAdminService.getFailedSearches(req.query.limit);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const manageSynonyms = async (req, res) => {
  try {
    const result = await searchAdminService.manageSynonyms(req.body.word, req.body.synonyms);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const manageStopWords = async (req, res) => {
  try {
    const result = await searchAdminService.manageStopWords(req.body.words);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getRankingRules = async (req, res) => {
  try {
    const result = await searchAdminService.getRankingRules();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const addBoostRule = async (req, res) => {
  try {
    const result = await searchAdminService.addBoostRule(req.body.productId, req.body.boost);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSearchSuggestionsAdmin = async (req, res) => {
  try {
    const result = await searchAdminService.getSuggestions(req.query.q);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getIndexStatus = async (req, res) => {
  try {
    const result = await searchAdminService.getIndexStatus();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const rebuildSearchIndex = async (req, res) => {
  try {
    const result = await searchAdminService.rebuildIndex(req.body.entityType);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSearchPerformance = async (req, res) => {
  try {
    const result = await searchAdminService.getSearchPerformance();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ─── Audit Center ───

export const getAuditTimeline = async (req, res) => {
  try {
    const result = await enterpriseAuditCenterService.getAuditTimeline(req.query);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getEntityHistory = async (req, res) => {
  try {
    const result = await enterpriseAuditCenterService.getEntityHistory(req.params.entityType, req.params.entityId);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getUserHistory = async (req, res) => {
  try {
    const result = await enterpriseAuditCenterService.getUserHistory(req.params.id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getActionHistory = async (req, res) => {
  try {
    const result = await enterpriseAuditCenterService.getActionHistory(req.params.action);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSecurityEvents = async (req, res) => {
  try {
    const result = await enterpriseAuditCenterService.getSecurityEvents();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getConfigurationChanges = async (req, res) => {
  try {
    const result = await enterpriseAuditCenterService.getConfigurationChanges();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getPermissionChanges = async (req, res) => {
  try {
    const result = await enterpriseAuditCenterService.getPermissionChanges();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const correlateEvents = async (req, res) => {
  try {
    const result = await enterpriseAuditCenterService.correlateEvents(req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getAuditDiff = async (req, res) => {
  try {
    const result = await enterpriseAuditCenterService.getDiff(req.query.entityType, req.query.entityId, req.query.version1, req.query.version2);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getAuditComplianceReport = async (req, res) => {
  try {
    const result = await enterpriseAuditCenterService.getComplianceReport(req.query.startDate, req.query.endDate);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const exportAuditCsv = async (req, res) => {
  try {
    const result = await enterpriseAuditCenterService.exportCsv(req.query);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ─── Operations Center ───

export const getSystemHealth = async (req, res) => {
  try {
    const result = await operationsCenterService.getSystemHealth();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getLiveMetrics = async (req, res) => {
  try {
    const result = await operationsCenterService.getLiveMetrics();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getQueues = async (req, res) => {
  try {
    const result = await operationsCenterService.getQueues();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSchedulerStatus = async (req, res) => {
  try {
    const result = await operationsCenterService.getSchedulerStatus();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getJobs = async (req, res) => {
  try {
    const result = await operationsCenterService.getJobs();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getCacheStatsOps = async (req, res) => {
  try {
    const result = await operationsCenterService.getCacheStats();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getMemoryUsage = async (req, res) => {
  try {
    const result = await operationsCenterService.getMemoryUsage();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getDatabaseStatus = async (req, res) => {
  try {
    const result = await operationsCenterService.getDatabaseStatus();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getApiStatus = async (req, res) => {
  try {
    const result = await operationsCenterService.getApiStatus();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getOpsNotificationStats = async (req, res) => {
  try {
    const result = await operationsCenterService.getNotificationStats();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getOpsErrors = async (req, res) => {
  try {
    const result = await operationsCenterService.getErrors();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getOperationalKpis = async (req, res) => {
  try {
    const result = await operationsCenterService.getOperationalKpis();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getRealtimeActivity = async (req, res) => {
  try {
    const result = await operationsCenterService.getRealtimeActivity(req.query.limit);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ─── Security Center ───

export const getSecurityDashboard = async (req, res) => {
  try {
    const result = await securityCenterService.getSecurityDashboard();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getThreats = async (req, res) => {
  try {
    const result = await securityCenterService.getThreats();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSecurityAlerts = async (req, res) => {
  try {
    const result = await securityCenterService.getSecurityAlerts();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getBlockedIpsOps = async (req, res) => {
  try {
    const result = await securityCenterService.getBlockedIps();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const blockIpOps = async (req, res) => {
  try {
    const result = await securityCenterService.blockIp(req.body.ip, req.body.reason);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const unblockIpOps = async (req, res) => {
  try {
    const result = await securityCenterService.unblockIp(req.params.ip);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getLoginAnalytics = async (req, res) => {
  try {
    const result = await securityCenterService.getLoginAnalytics();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getFailedLogins = async (req, res) => {
  try {
    const result = await securityCenterService.getFailedLogins(req.query);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getAdminActions = async (req, res) => {
  try {
    const result = await securityCenterService.getAdminActions();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getPasswordPolicies = async (req, res) => {
  try {
    const result = await securityCenterService.getPasswordPolicies();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updatePasswordPolicy = async (req, res) => {
  try {
    const result = await securityCenterService.updatePasswordPolicy(req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getActiveSessions = async (req, res) => {
  try {
    const result = await securityCenterService.getActiveSessions();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const terminateUserSession = async (req, res) => {
  try {
    const result = await securityCenterService.terminateSession(req.params.sessionId);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSecurityAuditOps = async (req, res) => {
  try {
    const result = await securityCenterService.getSecurityAudit();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getIncidentTimeline = async (req, res) => {
  try {
    const result = await securityCenterService.getIncidentTimeline();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ─── Runtime Configuration ───

export const getRuntimeSettings = async (req, res) => {
  try {
    const result = await configurationService.getRuntimeSettings(req.query.category);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getRuntimeSetting = async (req, res) => {
  try {
    const result = await configurationService.getRuntimeSetting(req.params.key);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const setRuntimeSetting = async (req, res) => {
  try {
    const result = await configurationService.setRuntimeSetting(req.params.key, req.body.value, req.user?._id);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteRuntimeSetting = async (req, res) => {
  try {
    const result = await configurationService.deleteRuntimeSetting(req.params.key);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getRuntimeVersionHistory = async (req, res) => {
  try {
    const result = await configurationService.getVersionHistory(req.params.key);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const rollbackRuntimeSetting = async (req, res) => {
  try {
    const result = await configurationService.rollbackSetting(req.params.key, req.params.version);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const validateRuntimeSetting = async (req, res) => {
  try {
    const result = await configurationService.validateSetting(req.params.key, req.body.value);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const importRuntimeSettings = async (req, res) => {
  try {
    const result = await configurationService.importSettings(req.body.data);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const exportRuntimeSettings = async (req, res) => {
  try {
    const result = await configurationService.exportSettings(req.query.category);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getEnvironmentOverrides = async (req, res) => {
  try {
    const result = await configurationService.getEnvironmentOverrides(req.params.environment);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const checkDependencies = async (req, res) => {
  try {
    const result = await configurationService.checkDependencies(req.params.key);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ─── Tenant Management ───

export const getTenants = async (req, res) => {
  try {
    const result = await tenantService.getTenants();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getTenant = async (req, res) => {
  try {
    const result = await tenantService.getTenant(req.params.slug);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createTenant = async (req, res) => {
  try {
    const result = await tenantService.createTenant(req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateTenant = async (req, res) => {
  try {
    const result = await tenantService.updateTenant(req.params.slug, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const suspendTenant = async (req, res) => {
  try {
    const result = await tenantService.suspendTenant(req.params.slug);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const activateTenant = async (req, res) => {
  try {
    const result = await tenantService.activateTenant(req.params.slug);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getTenantUsage = async (req, res) => {
  try {
    const result = await tenantService.getTenantUsage(req.params.slug);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const checkTenantQuota = async (req, res) => {
  try {
    const result = await tenantService.checkTenantQuota(req.params.slug, req.query.metric);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getTenantBranding = async (req, res) => {
  try {
    const result = await tenantService.getTenantBranding(req.params.slug);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateTenantBranding = async (req, res) => {
  try {
    const result = await tenantService.updateTenantBranding(req.params.slug, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getTenantUsageStats = async (req, res) => {
  try {
    const result = await tenantService.getUsageStats();
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};
