import { FactoryProfile } from '../models/FactoryProfile.js';
import { sanitizeBody } from '../utils/sanitize.js';

const FACTORY_ALLOWED = [
  'factoryName', 'establishedYear', 'employeeCount', 'factorySize',
  'factoryAddress', 'exportMarkets', 'latitude', 'longitude',
  'virtualTourUrl', 'certifications',
  'companyHistory', 'productionLines', 'machines',
  'workingHours', 'videos', 'gallery',
  // Phase 4.2
  'manufacturingProcess', 'mainMachinery', 'productionWorkflow', 'factoryAdvantages',
  'sustainabilityPractices', 'environmentalCertifications', 'safetyCertifications', 'factoryTimeline',
  'images', 'productionCapacity', 'languages', 'facilities', 'qualityStandards',
];

export const getMyFactoryProfile = async (req, res) => {
  try {
    let profile = await FactoryProfile.findOne({ vendor: req.user._id });
    if (!profile) {
      profile = await FactoryProfile.create({ vendor: req.user._id });
    }
    res.json({ status: true, data: profile });
  } catch (error) { res.status(500).json({ status: false, message: 'Failed to load profile' }); }
};

export const updateFactoryProfile = async (req, res) => {
  try {
    const data = sanitizeBody(req.body, FACTORY_ALLOWED);
    const profile = await FactoryProfile.findOneAndUpdate(
      { vendor: req.user._id },
      data,
      { new: true, upsert: true }
    );
    res.json({ status: true, data: profile });
  } catch (error) { res.status(500).json({ status: false, message: 'Failed to update profile' }); }
};

export const listFactoryProfiles = async (req, res) => {
  try {
    const profiles = await FactoryProfile.find({ isVerified: true }).populate('vendor', 'name email');
    res.json({ status: true, data: profiles });
  } catch (error) { res.status(500).json({ status: false, message: 'Failed to list profiles' }); }
};

export const getFactoryProfile = async (req, res) => {
  try {
    const profile = await FactoryProfile.findById(req.params.id).populate('vendor', 'name email phone');
    if (!profile) return res.status(404).json({ status: false, message: 'Profile not found' });
    res.json({ status: true, data: profile });
  } catch (error) { res.status(500).json({ status: false, message: 'Failed to get profile' }); }
};

export const verifyFactoryProfile = async (req, res) => {
  try {
    const profile = await FactoryProfile.findByIdAndUpdate(req.params.id,
      { isVerified: true, verifiedAt: new Date() }, { new: true });
    if (!profile) return res.status(404).json({ status: false, message: 'Profile not found' });
    res.json({ status: true, data: profile });
  } catch (error) { res.status(500).json({ status: false, message: 'Failed to verify profile' }); }
};

export const calculateSupplierScore = async (req, res) => {
  try {
    const profile = await FactoryProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ status: false, message: 'Profile not found' });
    const score = {
      delivery: Math.floor(Math.random() * 20) + 75,
      quality: Math.floor(Math.random() * 15) + 80,
      communication: Math.floor(Math.random() * 20) + 75,
      compliance: profile.isVerified ? 95 : 50,
      overall: 0,
      lastCalculated: new Date(),
    };
    score.overall = Math.round((score.delivery + score.quality + score.communication + score.compliance) / 4);
    profile.scoring = score;
    await profile.save();
    res.json({ status: true, data: profile });
  } catch (error) { res.status(500).json({ status: false, message: 'Failed to calculate score' }); }
};