import { whiteLabelService } from '../services/whiteLabelService.js';
import { licensingService } from '../services/licensingService.js';
import { installerService } from '../services/installerService.js';
import { upgradeService } from '../services/upgradeService.js';
import { pluginSdkService } from '../services/pluginSdkService.js';
import { themeEngineService } from '../services/themeEngineService.js';
import { editionManagementService } from '../services/editionManagementService.js';
import { customerSuccessService } from '../services/customerSuccessService.js';
import { enterpriseBillingService } from '../services/enterpriseBillingService.js';
import { extensionMarketplaceService } from '../services/extensionMarketplaceService.js';
import { enterpriseCliService } from '../services/enterpriseCliService.js';
import { releaseManagementService } from '../services/releaseManagementService.js';
import { customerPortalService } from '../services/customerPortalService.js';
import { enterpriseSupportService } from '../services/enterpriseSupportService.js';
import { certificationService } from '../services/certificationService.js';
import { commercialPackagingService } from '../services/commercialPackagingService.js';

// ============================================================
// Part 1 - White-Label SaaS Platform
// ============================================================

export const createBrand = async (req, res) => {
  try {
    const result = await whiteLabelService.createBrand(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const updateBrand = async (req, res) => {
  try {
    const result = await whiteLabelService.updateBrand(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getBrand = async (req, res) => {
  try {
    const result = await whiteLabelService.getBrand(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const listBrands = async (req, res) => {
  try {
    const result = await whiteLabelService.listBrands(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const deleteBrand = async (req, res) => {
  try {
    const result = await whiteLabelService.deleteBrand(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const setDefaultBrand = async (req, res) => {
  try {
    const result = await whiteLabelService.setDefaultBrand(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const duplicateBrand = async (req, res) => {
  try {
    const result = await whiteLabelService.duplicateBrand(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getBrandByDomain = async (req, res) => {
  try {
    const result = await whiteLabelService.getBrandByDomain(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const verifyDomain = async (req, res) => {
  try {
    const result = await whiteLabelService.verifyDomain(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const uploadAsset = async (req, res) => {
  try {
    const result = await whiteLabelService.uploadAsset(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const listAssets = async (req, res) => {
  try {
    const result = await whiteLabelService.listAssets(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const deleteAsset = async (req, res) => {
  try {
    const result = await whiteLabelService.deleteAsset(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const createTheme = async (req, res) => {
  try {
    const result = await whiteLabelService.createTheme(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const updateTheme = async (req, res) => {
  try {
    const result = await whiteLabelService.updateTheme(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const listThemes = async (req, res) => {
  try {
    const result = await whiteLabelService.listThemes(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const setDefaultTheme = async (req, res) => {
  try {
    const result = await whiteLabelService.setDefaultTheme(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const applyBranding = async (req, res) => {
  try {
    const result = await whiteLabelService.applyBranding(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getBrandingCSS = async (req, res) => {
  try {
    const result = await whiteLabelService.getBrandingCSS(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const validateBrand = async (req, res) => {
  try {
    const result = await whiteLabelService.validateBrand(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getTenantSettings = async (req, res) => {
  try {
    const result = await whiteLabelService.getTenantSettings(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const updateTenantSettings = async (req, res) => {
  try {
    const result = await whiteLabelService.updateTenantSettings(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 2 - Licensing & Entitlement
// ============================================================

export const createLicense = async (req, res) => {
  try {
    const result = await licensingService.createLicense(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const activateLicense = async (req, res) => {
  try {
    const result = await licensingService.activateLicense(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const offlineActivation = async (req, res) => {
  try {
    const result = await licensingService.offlineActivation(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const validateLicense = async (req, res) => {
  try {
    const result = await licensingService.validateLicense(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const deactivateLicense = async (req, res) => {
  try {
    const result = await licensingService.deactivateLicense(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const revokeLicense = async (req, res) => {
  try {
    const result = await licensingService.revokeLicense(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const listLicenses = async (req, res) => {
  try {
    const result = await licensingService.listLicenses(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getLicense = async (req, res) => {
  try {
    const result = await licensingService.getLicense(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const addSeat = async (req, res) => {
  try {
    const result = await licensingService.addSeat(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const removeSeat = async (req, res) => {
  try {
    const result = await licensingService.removeSeat(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const listSeats = async (req, res) => {
  try {
    const result = await licensingService.listSeats(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const recordUsage = async (req, res) => {
  try {
    const result = await licensingService.recordUsage(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getUsage = async (req, res) => {
  try {
    const result = await licensingService.getUsage(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const checkFeatureEntitlement = async (req, res) => {
  try {
    const result = await licensingService.checkFeatureEntitlement(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const renewLicense = async (req, res) => {
  try {
    const result = await licensingService.renewLicense(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const transferLicense = async (req, res) => {
  try {
    const result = await licensingService.transferLicense(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getLicenseSummary = async (req, res) => {
  try {
    const result = await licensingService.getLicenseSummary(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const expireLicenses = async (req, res) => {
  try {
    const result = await licensingService.expireLicenses(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const validateAllLicenses = async (req, res) => {
  try {
    const result = await licensingService.validateAllLicenses(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const generateActivationCode = async (req, res) => {
  try {
    const result = await licensingService.generateActivationCode(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 3 - Installer
// ============================================================

export const startInstallation = async (req, res) => {
  try {
    const result = await installerService.startInstallation(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const runStep = async (req, res) => {
  try {
    const result = await installerService.runStep(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const runAllSteps = async (req, res) => {
  try {
    const result = await installerService.runAllSteps(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const validateEnvironment = async (req, res) => {
  try {
    const result = await installerService.validateEnvironment(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const configureDatabase = async (req, res) => {
  try {
    const result = await installerService.configureDatabase(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const configureRedis = async (req, res) => {
  try {
    const result = await installerService.configureRedis(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const configureSMTP = async (req, res) => {
  try {
    const result = await installerService.configureSMTP(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const configureStorage = async (req, res) => {
  try {
    const result = await installerService.configureStorage(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const configureAI = async (req, res) => {
  try {
    const result = await installerService.configureAI(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const createInitialAdmin = async (req, res) => {
  try {
    const result = await installerService.createInitialAdmin(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const installSampleData = async (req, res) => {
  try {
    const result = await installerService.installSampleData(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const verifyInstallation = async (req, res) => {
  try {
    const result = await installerService.verifyInstallation(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const rollbackInstallation = async (req, res) => {
  try {
    const result = await installerService.rollbackInstallation(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getInstallationStatus = async (req, res) => {
  try {
    const result = await installerService.getInstallationStatus(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const listInstallations = async (req, res) => {
  try {
    const result = await installerService.listInstallations(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 4 - Upgrade
// ============================================================

export const detectCurrentVersion = async (req, res) => {
  try {
    const result = await upgradeService.detectCurrentVersion(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const planUpgrade = async (req, res) => {
  try {
    const result = await upgradeService.planUpgrade(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const createMigration = async (req, res) => {
  try {
    const result = await upgradeService.createMigration(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const runMigration = async (req, res) => {
  try {
    const result = await upgradeService.runMigration(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const rollbackMigration = async (req, res) => {
  try {
    const result = await upgradeService.rollbackMigration(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const runUpgrade = async (req, res) => {
  try {
    const result = await upgradeService.runUpgrade(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const rollbackUpgrade = async (req, res) => {
  try {
    const result = await upgradeService.rollbackUpgrade(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const validateUpgrade = async (req, res) => {
  try {
    const result = await upgradeService.validateUpgrade(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const dryRunUpgrade = async (req, res) => {
  try {
    const result = await upgradeService.dryRunUpgrade(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getVersionHistory = async (req, res) => {
  try {
    const result = await upgradeService.getVersionHistory(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getUpgradePath = async (req, res) => {
  try {
    const result = await upgradeService.getUpgradePath(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const checkCompatibility = async (req, res) => {
  try {
    const result = await upgradeService.checkCompatibility(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const generateReleaseNotes = async (req, res) => {
  try {
    const result = await upgradeService.generateReleaseNotes(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const recordUpgrade = async (req, res) => {
  try {
    const result = await upgradeService.recordUpgrade(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const listMigrations = async (req, res) => {
  try {
    const result = await upgradeService.listMigrations(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getMigration = async (req, res) => {
  try {
    const result = await upgradeService.getMigration(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 5 - Plugin SDK
// ============================================================

export const registerPlugin = async (req, res) => {
  try {
    const result = await pluginSdkService.registerPlugin(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const unregisterPlugin = async (req, res) => {
  try {
    const result = await pluginSdkService.unregisterPlugin(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getHooks = async (req, res) => {
  try {
    const result = await pluginSdkService.getHooks(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getEvents = async (req, res) => {
  try {
    const result = await pluginSdkService.getEvents(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const registerHook = async (req, res) => {
  try {
    const result = await pluginSdkService.registerHook(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const registerEvent = async (req, res) => {
  try {
    const result = await pluginSdkService.registerEvent(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const registerPermission = async (req, res) => {
  try {
    const result = await pluginSdkService.registerPermission(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const executeHooks = async (req, res) => {
  try {
    const result = await pluginSdkService.executeHooks(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const emitEvent = async (req, res) => {
  try {
    const result = await pluginSdkService.emitEvent(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const listPlugins = async (req, res) => {
  try {
    const result = await pluginSdkService.listPlugins(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getPluginManifest = async (req, res) => {
  try {
    const result = await pluginSdkService.getPluginManifest(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const validatePlugin = async (req, res) => {
  try {
    const result = await pluginSdkService.validatePlugin(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const checkPermissions = async (req, res) => {
  try {
    const result = await pluginSdkService.checkPermissions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getHookDefinitions = async (req, res) => {
  try {
    const result = await pluginSdkService.getHookDefinitions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getEventDefinitions = async (req, res) => {
  try {
    const result = await pluginSdkService.getEventDefinitions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 6 - Theme Engine
// ============================================================

export const createTheme_ = async (req, res) => {
  try {
    const result = await themeEngineService.createTheme(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const updateTheme_ = async (req, res) => {
  try {
    const result = await themeEngineService.updateTheme(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getTheme = async (req, res) => {
  try {
    const result = await themeEngineService.getTheme(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const listThemes_ = async (req, res) => {
  try {
    const result = await themeEngineService.listThemes(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const deleteTheme = async (req, res) => {
  try {
    const result = await themeEngineService.deleteTheme(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const duplicateTheme = async (req, res) => {
  try {
    const result = await themeEngineService.duplicateTheme(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const exportTheme = async (req, res) => {
  try {
    const result = await themeEngineService.exportTheme(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const importTheme = async (req, res) => {
  try {
    const result = await themeEngineService.importTheme(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const createLayout = async (req, res) => {
  try {
    const result = await themeEngineService.createLayout(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const updateLayout = async (req, res) => {
  try {
    const result = await themeEngineService.updateLayout(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const listLayouts = async (req, res) => {
  try {
    const result = await themeEngineService.listLayouts(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const createComponent = async (req, res) => {
  try {
    const result = await themeEngineService.createComponent(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const updateComponent = async (req, res) => {
  try {
    const result = await themeEngineService.updateComponent(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const listComponents = async (req, res) => {
  try {
    const result = await themeEngineService.listComponents(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const generateThemeCSS = async (req, res) => {
  try {
    const result = await themeEngineService.generateThemeCSS(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const previewTheme = async (req, res) => {
  try {
    const result = await themeEngineService.previewTheme(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const setActiveTheme = async (req, res) => {
  try {
    const result = await themeEngineService.setActiveTheme(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getActiveTheme = async (req, res) => {
  try {
    const result = await themeEngineService.getActiveTheme(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const compileTheme = async (req, res) => {
  try {
    const result = await themeEngineService.compileTheme(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 7 - Edition Management
// ============================================================

export const createEdition = async (req, res) => {
  try {
    const result = await editionManagementService.createEdition(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const updateEdition = async (req, res) => {
  try {
    const result = await editionManagementService.updateEdition(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getEdition = async (req, res) => {
  try {
    const result = await editionManagementService.getEdition(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const listEditions = async (req, res) => {
  try {
    const result = await editionManagementService.listEditions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const deleteEdition = async (req, res) => {
  try {
    const result = await editionManagementService.deleteEdition(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getEditionsByType = async (req, res) => {
  try {
    const result = await editionManagementService.getEditionsByType(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getEditionForTenant = async (req, res) => {
  try {
    const result = await editionManagementService.getEditionForTenant(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const checkFeatureAccess = async (req, res) => {
  try {
    const result = await editionManagementService.checkFeatureAccess(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const createFeature = async (req, res) => {
  try {
    const result = await editionManagementService.createFeature(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const updateFeature = async (req, res) => {
  try {
    const result = await editionManagementService.updateFeature(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const createPackage = async (req, res) => {
  try {
    const result = await editionManagementService.createPackage(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const updatePackage = async (req, res) => {
  try {
    const result = await editionManagementService.updatePackage(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getPackages = async (req, res) => {
  try {
    const result = await editionManagementService.getPackages(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getFeatureLimits = async (req, res) => {
  try {
    const result = await editionManagementService.getFeatureLimits(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const compareEditions = async (req, res) => {
  try {
    const result = await editionManagementService.compareEditions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getEditionComparison = async (req, res) => {
  try {
    const result = await editionManagementService.getEditionComparison(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const validateEditionFeatures = async (req, res) => {
  try {
    const result = await editionManagementService.validateEditionFeatures(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 8 - Customer Success
// ============================================================

export const calculateHealthScore = async (req, res) => {
  try {
    const result = await customerSuccessService.calculateHealthScore(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getHealth = async (req, res) => {
  try {
    const result = await customerSuccessService.getHealth(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const listHealth = async (req, res) => {
  try {
    const result = await customerSuccessService.listHealth(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const createSuccessPlan = async (req, res) => {
  try {
    const result = await customerSuccessService.createSuccessPlan(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const updateSuccessPlan = async (req, res) => {
  try {
    const result = await customerSuccessService.updateSuccessPlan(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getSuccessPlan = async (req, res) => {
  try {
    const result = await customerSuccessService.getSuccessPlan(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const listSuccessPlans = async (req, res) => {
  try {
    const result = await customerSuccessService.listSuccessPlans(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const recordMilestone = async (req, res) => {
  try {
    const result = await customerSuccessService.recordMilestone(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getCustomerJourney = async (req, res) => {
  try {
    const result = await customerSuccessService.getCustomerJourney(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const updateJourneyStage = async (req, res) => {
  try {
    const result = await customerSuccessService.updateJourneyStage(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const recordTouchpoint = async (req, res) => {
  try {
    const result = await customerSuccessService.recordTouchpoint(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const generateRecommendations = async (req, res) => {
  try {
    const result = await customerSuccessService.generateRecommendations(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const calculateRenewalProbability = async (req, res) => {
  try {
    const result = await customerSuccessService.calculateRenewalProbability(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const calculateChurnRisk = async (req, res) => {
  try {
    const result = await customerSuccessService.calculateChurnRisk(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getAtRiskTenants = async (req, res) => {
  try {
    const result = await customerSuccessService.getAtRiskTenants(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getExpansionOpportunities = async (req, res) => {
  try {
    const result = await customerSuccessService.getExpansionOpportunities(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const recalculateAllHealth = async (req, res) => {
  try {
    const result = await customerSuccessService.recalculateAllHealth(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 9 - Enterprise Billing
// ============================================================

export const createAccount = async (req, res) => {
  try {
    const result = await enterpriseBillingService.createAccount(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getAccount = async (req, res) => {
  try {
    const result = await enterpriseBillingService.getAccount(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const updateAccount = async (req, res) => {
  try {
    const result = await enterpriseBillingService.updateAccount(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const listAccounts = async (req, res) => {
  try {
    const result = await enterpriseBillingService.listAccounts(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const generateInvoice = async (req, res) => {
  try {
    const result = await enterpriseBillingService.generateInvoice(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getInvoice = async (req, res) => {
  try {
    const result = await enterpriseBillingService.getInvoice(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const listInvoices = async (req, res) => {
  try {
    const result = await enterpriseBillingService.listInvoices(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const updateInvoiceStatus = async (req, res) => {
  try {
    const result = await enterpriseBillingService.updateInvoiceStatus(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const recordUsage_ = async (req, res) => {
  try {
    const result = await enterpriseBillingService.recordUsage(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const listUsage = async (req, res) => {
  try {
    const result = await enterpriseBillingService.listUsage(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const createAdjustment = async (req, res) => {
  try {
    const result = await enterpriseBillingService.createAdjustment(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const applyAdjustment = async (req, res) => {
  try {
    const result = await enterpriseBillingService.applyAdjustment(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const calculateTotals = async (req, res) => {
  try {
    const result = await enterpriseBillingService.calculateTotals(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getBillingSummary = async (req, res) => {
  try {
    const result = await enterpriseBillingService.getBillingSummary(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getOutstandingBalance = async (req, res) => {
  try {
    const result = await enterpriseBillingService.getOutstandingBalance(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const generateMonthlyInvoices = async (req, res) => {
  try {
    const result = await enterpriseBillingService.generateMonthlyInvoices(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const aggregateUsage = async (req, res) => {
  try {
    const result = await enterpriseBillingService.aggregateUsage(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getBillingAnalytics = async (req, res) => {
  try {
    const result = await enterpriseBillingService.getBillingAnalytics(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 10 - Extension Store / Marketplace
// ============================================================

export const registerExtension = async (req, res) => {
  try {
    const result = await extensionMarketplaceService.registerExtension(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const updateExtension = async (req, res) => {
  try {
    const result = await extensionMarketplaceService.updateExtension(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getExtension = async (req, res) => {
  try {
    const result = await extensionMarketplaceService.getExtension(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const listExtensions = async (req, res) => {
  try {
    const result = await extensionMarketplaceService.listExtensions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const approveExtension = async (req, res) => {
  try {
    const result = await extensionMarketplaceService.approveExtension(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const rejectExtension = async (req, res) => {
  try {
    const result = await extensionMarketplaceService.rejectExtension(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const publishExtension = async (req, res) => {
  try {
    const result = await extensionMarketplaceService.publishExtension(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const archiveExtension = async (req, res) => {
  try {
    const result = await extensionMarketplaceService.archiveExtension(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const result = await extensionMarketplaceService.createCategory(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const result = await extensionMarketplaceService.updateCategory(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const listCategories = async (req, res) => {
  try {
    const result = await extensionMarketplaceService.listCategories(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const installExtension = async (req, res) => {
  try {
    const result = await extensionMarketplaceService.installExtension(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const uninstallExtension = async (req, res) => {
  try {
    const result = await extensionMarketplaceService.uninstallExtension(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const upgradeExtension = async (req, res) => {
  try {
    const result = await extensionMarketplaceService.upgradeExtension(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const enableExtension = async (req, res) => {
  try {
    const result = await extensionMarketplaceService.enableExtension(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const disableExtension = async (req, res) => {
  try {
    const result = await extensionMarketplaceService.disableExtension(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const addReview = async (req, res) => {
  try {
    const result = await extensionMarketplaceService.addReview(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getReviews = async (req, res) => {
  try {
    const result = await extensionMarketplaceService.getReviews(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const checkCompatibility_ = async (req, res) => {
  try {
    const result = await extensionMarketplaceService.checkCompatibility(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const searchExtensions = async (req, res) => {
  try {
    const result = await extensionMarketplaceService.searchExtensions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getExtensionUsage = async (req, res) => {
  try {
    const result = await extensionMarketplaceService.getExtensionUsage(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getPopularExtensions = async (req, res) => {
  try {
    const result = await extensionMarketplaceService.getPopularExtensions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const validateExtensionCompatibility = async (req, res) => {
  try {
    const result = await extensionMarketplaceService.validateExtensionCompatibility(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 11 - Enterprise CLI
// ============================================================

export const getCommandDefinitions = async (req, res) => {
  try {
    const result = await enterpriseCliService.getCommandDefinitions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getCommand = async (req, res) => {
  try {
    const result = await enterpriseCliService.getCommand(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const generateCommandDocs = async (req, res) => {
  try {
    const result = await enterpriseCliService.generateCommandDocs(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getInstallCommand = async (req, res) => {
  try {
    const result = await enterpriseCliService.getInstallCommand(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getUpgradeCommand = async (req, res) => {
  try {
    const result = await enterpriseCliService.getUpgradeCommand(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getMigrateCommand = async (req, res) => {
  try {
    const result = await enterpriseCliService.getMigrateCommand(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getBackupCommand = async (req, res) => {
  try {
    const result = await enterpriseCliService.getBackupCommand(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getRestoreCommand = async (req, res) => {
  try {
    const result = await enterpriseCliService.getRestoreCommand(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getDiagnosticsCommand = async (req, res) => {
  try {
    const result = await enterpriseCliService.getDiagnosticsCommand(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getOptimizeCommand = async (req, res) => {
  try {
    const result = await enterpriseCliService.getOptimizeCommand(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getVerifyCommand = async (req, res) => {
  try {
    const result = await enterpriseCliService.getVerifyCommand(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getLicenseCommand = async (req, res) => {
  try {
    const result = await enterpriseCliService.getLicenseCommand(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getTenantCommand = async (req, res) => {
  try {
    const result = await enterpriseCliService.getTenantCommand(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const validateCommand = async (req, res) => {
  try {
    const result = await enterpriseCliService.validateCommand(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getHelpText = async (req, res) => {
  try {
    const result = await enterpriseCliService.getHelpText(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 12 - Release Management
// ============================================================

export const createRelease = async (req, res) => {
  try {
    const result = await releaseManagementService.createRelease(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const updateRelease = async (req, res) => {
  try {
    const result = await releaseManagementService.updateRelease(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getRelease = async (req, res) => {
  try {
    const result = await releaseManagementService.getRelease(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const listReleases = async (req, res) => {
  try {
    const result = await releaseManagementService.listReleases(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const publishRelease = async (req, res) => {
  try {
    const result = await releaseManagementService.publishRelease(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const deprecateRelease = async (req, res) => {
  try {
    const result = await releaseManagementService.deprecateRelease(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const archiveRelease = async (req, res) => {
  try {
    const result = await releaseManagementService.archiveRelease(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const createReleaseNote = async (req, res) => {
  try {
    const result = await releaseManagementService.createReleaseNote(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const updateReleaseNote = async (req, res) => {
  try {
    const result = await releaseManagementService.updateReleaseNote(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getReleaseNotes = async (req, res) => {
  try {
    const result = await releaseManagementService.getReleaseNotes(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const checkCompatibility__ = async (req, res) => {
  try {
    const result = await releaseManagementService.checkCompatibility(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getCompatibilityReport = async (req, res) => {
  try {
    const result = await releaseManagementService.getCompatibilityReport(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getUpgradeAssistant = async (req, res) => {
  try {
    const result = await releaseManagementService.getUpgradeAssistant(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getChangelog = async (req, res) => {
  try {
    const result = await releaseManagementService.getChangelog(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getLatestVersion = async (req, res) => {
  try {
    const result = await releaseManagementService.getLatestVersion(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getVersionTimeline = async (req, res) => {
  try {
    const result = await releaseManagementService.getVersionTimeline(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const generateMigrationGuide = async (req, res) => {
  try {
    const result = await releaseManagementService.generateMigrationGuide(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const compareVersions = async (req, res) => {
  try {
    const result = await releaseManagementService.compareVersions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 13 - Customer Portal
// ============================================================

export const createPortal = async (req, res) => {
  try {
    const result = await customerPortalService.createPortal(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const updatePortal = async (req, res) => {
  try {
    const result = await customerPortalService.updatePortal(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getPortal = async (req, res) => {
  try {
    const result = await customerPortalService.getPortal(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const listPortals = async (req, res) => {
  try {
    const result = await customerPortalService.listPortals(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const addDownloadPackage = async (req, res) => {
  try {
    const result = await customerPortalService.addDownloadPackage(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const updateDownloadPackage = async (req, res) => {
  try {
    const result = await customerPortalService.updateDownloadPackage(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const listDownloadPackages = async (req, res) => {
  try {
    const result = await customerPortalService.listDownloadPackages(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getDownloadPackage = async (req, res) => {
  try {
    const result = await customerPortalService.getDownloadPackage(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const recordDownload = async (req, res) => {
  try {
    const result = await customerPortalService.recordDownload(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const createTicket = async (req, res) => {
  try {
    const result = await customerPortalService.createTicket(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const updateTicket = async (req, res) => {
  try {
    const result = await customerPortalService.updateTicket(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getTicket = async (req, res) => {
  try {
    const result = await customerPortalService.getTicket(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const listTickets = async (req, res) => {
  try {
    const result = await customerPortalService.listTickets(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const addTicketMessage = async (req, res) => {
  try {
    const result = await customerPortalService.addTicketMessage(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const closeTicket = async (req, res) => {
  try {
    const result = await customerPortalService.closeTicket(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getPortalAnalytics = async (req, res) => {
  try {
    const result = await customerPortalService.getPortalAnalytics(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getLicenseDownloads = async (req, res) => {
  try {
    const result = await customerPortalService.getLicenseDownloads(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 14 - Enterprise Support Center
// ============================================================

export const createSession = async (req, res) => {
  try {
    const result = await enterpriseSupportService.createSession(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getSession = async (req, res) => {
  try {
    const result = await enterpriseSupportService.getSession(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const endSession = async (req, res) => {
  try {
    const result = await enterpriseSupportService.endSession(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const listSessions = async (req, res) => {
  try {
    const result = await enterpriseSupportService.listSessions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const generateDiagnosticBundle = async (req, res) => {
  try {
    const result = await enterpriseSupportService.generateDiagnosticBundle(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getDiagnosticBundle = async (req, res) => {
  try {
    const result = await enterpriseSupportService.getDiagnosticBundle(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const listDiagnosticBundles = async (req, res) => {
  try {
    const result = await enterpriseSupportService.listDiagnosticBundles(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const generateSystemSnapshot = async (req, res) => {
  try {
    const result = await enterpriseSupportService.generateSystemSnapshot(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const generateHealthReport = async (req, res) => {
  try {
    const result = await enterpriseSupportService.generateHealthReport(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const generateSupportPackage = async (req, res) => {
  try {
    const result = await enterpriseSupportService.generateSupportPackage(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const createAccessToken = async (req, res) => {
  try {
    const result = await enterpriseSupportService.createAccessToken(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const validateAccessToken = async (req, res) => {
  try {
    const result = await enterpriseSupportService.validateAccessToken(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const revokeAccessToken = async (req, res) => {
  try {
    const result = await enterpriseSupportService.revokeAccessToken(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getSessionLogs = async (req, res) => {
  try {
    const result = await enterpriseSupportService.getSessionLogs(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const verifySupportAccess = async (req, res) => {
  try {
    const result = await enterpriseSupportService.verifySupportAccess(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const cleanupExpiredSessions = async (req, res) => {
  try {
    const result = await enterpriseSupportService.cleanupExpiredSessions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 15 - Certification
// ============================================================

export const getChecklist = async (req, res) => {
  try {
    const result = await certificationService.getChecklist(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const updateChecklist = async (req, res) => {
  try {
    const result = await certificationService.updateChecklist(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const listChecklists = async (req, res) => {
  try {
    const result = await certificationService.listChecklists(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const runCertification = async (req, res) => {
  try {
    const result = await certificationService.runCertification(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getCertification = async (req, res) => {
  try {
    const result = await certificationService.getCertification(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const listCertifications = async (req, res) => {
  try {
    const result = await certificationService.listCertifications(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const recalculateCertification = async (req, res) => {
  try {
    const result = await certificationService.recalculateCertification(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const runProductionReadiness = async (req, res) => {
  try {
    const result = await certificationService.runProductionReadiness(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const runSecurityReadiness = async (req, res) => {
  try {
    const result = await certificationService.runSecurityReadiness(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const runPerformanceReadiness = async (req, res) => {
  try {
    const result = await certificationService.runPerformanceReadiness(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const runDeploymentReadiness = async (req, res) => {
  try {
    const result = await certificationService.runDeploymentReadiness(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const runComplianceReadiness = async (req, res) => {
  try {
    const result = await certificationService.runComplianceReadiness(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const runMarketplaceReadiness = async (req, res) => {
  try {
    const result = await certificationService.runMarketplaceReadiness(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const calculateScore = async (req, res) => {
  try {
    const result = await certificationService.calculateScore(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const generateRecommendations_ = async (req, res) => {
  try {
    const result = await certificationService.generateRecommendations(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getLatestCertifications = async (req, res) => {
  try {
    const result = await certificationService.getLatestCertifications(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const cleanupOldReports = async (req, res) => {
  try {
    const result = await certificationService.cleanupOldReports(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 16 - Demo / Commercial Packaging
// ============================================================

export const createDemoEnvironment = async (req, res) => {
  try {
    const result = await commercialPackagingService.createDemoEnvironment(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getDemoEnvironment = async (req, res) => {
  try {
    const result = await commercialPackagingService.getDemoEnvironment(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const listDemoEnvironments = async (req, res) => {
  try {
    const result = await commercialPackagingService.listDemoEnvironments(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const deleteDemoEnvironment = async (req, res) => {
  try {
    const result = await commercialPackagingService.deleteDemoEnvironment(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const extendDemoEnvironment = async (req, res) => {
  try {
    const result = await commercialPackagingService.extendDemoEnvironment(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const createDataset = async (req, res) => {
  try {
    const result = await commercialPackagingService.createDataset(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getDataset = async (req, res) => {
  try {
    const result = await commercialPackagingService.getDataset(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const listDatasets = async (req, res) => {
  try {
    const result = await commercialPackagingService.listDatasets(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const createSampleCompany = async (req, res) => {
  try {
    const result = await commercialPackagingService.createSampleCompany(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const generateManufacturingDataset = async (req, res) => {
  try {
    const result = await commercialPackagingService.generateManufacturingDataset(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const generateRetailDataset = async (req, res) => {
  try {
    const result = await commercialPackagingService.generateRetailDataset(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const generateGeneralDataset = async (req, res) => {
  try {
    const result = await commercialPackagingService.generateGeneralDataset(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const populateDemoEnvironment = async (req, res) => {
  try {
    const result = await commercialPackagingService.populateDemoEnvironment(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getDemoAnalytics = async (req, res) => {
  try {
    const result = await commercialPackagingService.getDemoAnalytics(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const cleanupExpiredEnvironments = async (req, res) => {
  try {
    const result = await commercialPackagingService.cleanupExpiredEnvironments(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const getDemoStatus = async (req, res) => {
  try {
    const result = await commercialPackagingService.getDemoStatus(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

export const markAllAsDemo = async (req, res) => {
  try {
    const result = await commercialPackagingService.markAllAsDemo(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};
