import { MarketingCampaign } from '../models/MarketingCampaign.js';

class MarketingCenterService {
  async createCampaign(vendorId, data) {
    return MarketingCampaign.create({ ...data, vendor: vendorId, status: 'draft' });
  }

  async getCampaigns(vendorId) {
    return MarketingCampaign.find({ vendor: vendorId }).sort({ createdAt: -1 });
  }

  async getCampaign(vendorId, campaignId) {
    return MarketingCampaign.findOne({ _id: campaignId, vendor: vendorId });
  }

  async updateCampaign(vendorId, campaignId, data) {
    return MarketingCampaign.findOneAndUpdate({ _id: campaignId, vendor: vendorId }, { $set: data }, { new: true });
  }

  async deleteCampaign(vendorId, campaignId) {
    return MarketingCampaign.findOneAndDelete({ _id: campaignId, vendor: vendorId });
  }

  async launchCampaign(vendorId, campaignId) {
    const campaign = await MarketingCampaign.findOne({ _id: campaignId, vendor: vendorId });
    if (!campaign) throw new Error('Campaign not found');
    campaign.status = 'active';
    campaign.launchedAt = new Date();
    await campaign.save();
    return campaign;
  }

  async pauseCampaign(vendorId, campaignId) {
    const campaign = await MarketingCampaign.findOne({ _id: campaignId, vendor: vendorId });
    if (!campaign) throw new Error('Campaign not found');
    campaign.status = 'paused';
    await campaign.save();
    return campaign;
  }

  async completeCampaign(vendorId, campaignId) {
    const campaign = await MarketingCampaign.findOne({ _id: campaignId, vendor: vendorId });
    if (!campaign) throw new Error('Campaign not found');
    campaign.status = 'completed';
    campaign.completedAt = new Date();
    await campaign.save();
    return campaign;
  }

  async getCampaignStats(vendorId) {
    const campaigns = await MarketingCampaign.find({ vendor: vendorId });
    const total = campaigns.length;
    const active = campaigns.filter(c => c.status === 'active').length;
    const draft = campaigns.filter(c => c.status === 'draft').length;
    const completed = campaigns.filter(c => c.status === 'completed').length;
    const paused = campaigns.filter(c => c.status === 'paused').length;
    const totalBudget = campaigns.reduce((s, c) => s + (c.budget || 0), 0);
    const totalSpent = campaigns.reduce((s, c) => s + (c.spent || 0), 0);
    return { total, active, draft, completed, paused, totalBudget, totalSpent };
  }
}

export const marketingCenterService = new MarketingCenterService();
