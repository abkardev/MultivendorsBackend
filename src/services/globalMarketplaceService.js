import mongoose from 'mongoose';
import { Country } from '../models/Country.js';
import { Region } from '../models/Region.js';
import { Currency } from '../models/Currency.js';
import { TaxRegion } from '../models/TaxRegion.js';
import { LocalizationSetting } from '../models/LocalizationSetting.js';
import { HolidayCalendar } from '../models/HolidayCalendar.js';
import { logAuditEvent } from './auditService.js';

class GlobalMarketplaceService {
  async getCountries(regionId) {
    const filter = { isActive: true };
    if (regionId) filter.region = new mongoose.Types.ObjectId(regionId);
    const countries = await Country.find(filter).populate('region', 'name code').populate('currency', 'code symbol').sort({ 'name.en': 1 }).lean();
    return countries;
  }

  async getCountry(id) {
    const country = await Country.findById(id).populate('region', 'name code').populate('currency', 'code symbol name').lean();
    if (!country) throw new Error('Country not found');
    return country;
  }

  async createCountry(userId, data) {
    const existing = await Country.findOne({ code: data.code?.toUpperCase() });
    if (existing) throw new Error(`Country with code "${data.code}" already exists`);
    if (data.region) {
      const region = await Region.findById(data.region);
      if (!region) throw new Error('Region not found');
    }
    if (data.currency) {
      const currency = await Currency.findById(data.currency);
      if (!currency) throw new Error('Currency not found');
    }
    const country = await Country.create(data);
    await logAuditEvent({
      userId, action: 'marketplace.country.create', category: 'global',
      entityType: 'Country', entityId: country._id,
      newValue: { code: country.code, name: country.name, region: data.region },
      description: `Country "${country.code}" created`,
    });
    return country;
  }

  async updateCountry(userId, id, data) {
    const old = await Country.findById(id);
    if (!old) throw new Error('Country not found');
    if (data.code && data.code !== old.code) {
      const dup = await Country.findOne({ code: data.code.toUpperCase(), _id: { $ne: id } });
      if (dup) throw new Error(`Country code "${data.code}" already in use`);
    }
    const country = await Country.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    await logAuditEvent({
      userId, action: 'marketplace.country.update', category: 'global',
      entityType: 'Country', entityId: id,
      oldValue: { code: old.code, name: old.name, isActive: old.isActive },
      newValue: { code: country.code, name: country.name, isActive: country.isActive },
      description: `Country "${country.code}" updated`,
    });
    return country;
  }

  async deleteCountry(userId, id) {
    const country = await Country.findById(id);
    if (!country) throw new Error('Country not found');
    country.isActive = false;
    await country.save();
    await logAuditEvent({
      userId, action: 'marketplace.country.deactivate', category: 'global',
      entityType: 'Country', entityId: id,
      oldValue: { isActive: true },
      newValue: { isActive: false },
      description: `Country "${country.code}" deactivated`,
    });
    return { message: 'Country deactivated', id };
  }

  async getRegions() {
    const regions = await Region.find({ isActive: true }).sort({ 'name.en': 1 }).lean();
    const withCounts = await Promise.all(
      regions.map(async (r) => {
        const countryCount = await Country.countDocuments({ region: r._id, isActive: true });
        return { ...r, countryCount };
      }),
    );
    return withCounts;
  }

  async createRegion(userId, data) {
    const existing = await Region.findOne({ code: data.code });
    if (existing) throw new Error(`Region with code "${data.code}" already exists`);
    const region = await Region.create(data);
    await logAuditEvent({
      userId, action: 'marketplace.region.create', category: 'global',
      entityType: 'Region', entityId: region._id,
      newValue: { code: region.code, name: region.name },
      description: `Region "${region.name.en}" created`,
    });
    return region;
  }

  async updateRegion(userId, id, data) {
    const region = await Region.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!region) throw new Error('Region not found');
    await logAuditEvent({
      userId, action: 'marketplace.region.update', category: 'global',
      entityType: 'Region', entityId: id,
      newValue: { code: region.code, name: region.name },
      description: `Region "${region.name.en}" updated`,
    });
    return region;
  }

  async deleteRegion(userId, id) {
    const region = await Region.findById(id);
    if (!region) throw new Error('Region not found');
    await Country.updateMany({ region: id }, { $unset: { region: '' } });
    await Region.deleteOne({ _id: id });
    await logAuditEvent({
      userId, action: 'marketplace.region.delete', category: 'global',
      entityType: 'Region', entityId: id,
      oldValue: { code: region.code, name: region.name },
      description: `Region "${region.name.en}" deleted`,
    });
    return { message: 'Region deleted', id };
  }

  async getCurrencies() {
    const currencies = await Currency.find({ isActive: true }).sort({ code: 1 }).lean();
    return currencies;
  }

  async createCurrency(userId, data) {
    const existing = await Currency.findOne({ code: data.code?.toUpperCase() });
    if (existing) throw new Error(`Currency with code "${data.code}" already exists`);
    if (data.isDefault) {
      await Currency.updateMany({}, { $set: { isDefault: false } });
    }
    const currency = await Currency.create(data);
    await logAuditEvent({
      userId, action: 'marketplace.currency.create', category: 'global',
      entityType: 'Currency', entityId: currency._id,
      newValue: { code: currency.code, symbol: currency.symbol },
      description: `Currency "${currency.code}" created`,
    });
    return currency;
  }

  async updateCurrency(userId, id, data) {
    if (data.isDefault) {
      await Currency.updateMany({ _id: { $ne: id } }, { $set: { isDefault: false } });
    }
    const currency = await Currency.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!currency) throw new Error('Currency not found');
    await logAuditEvent({
      userId, action: 'marketplace.currency.update', category: 'global',
      entityType: 'Currency', entityId: id,
      newValue: { code: currency.code, isDefault: currency.isDefault, exchangeRate: currency.exchangeRate },
      description: `Currency "${currency.code}" updated`,
    });
    return currency;
  }

  async getTaxRegions(countryId) {
    const filter = { isActive: true };
    if (countryId) filter.countries = new mongoose.Types.ObjectId(countryId);
    const taxRegions = await TaxRegion.find(filter).populate('countries', 'code name').sort({ 'name.en': 1 }).lean();
    return taxRegions;
  }

  async createTaxRegion(userId, data) {
    if (data.countries && data.countries.length > 0) {
      const existing = await Country.countDocuments({ _id: { $in: data.countries }, isActive: true });
      if (existing !== data.countries.length) throw new Error('One or more countries not found or inactive');
    }
    const taxRegion = await TaxRegion.create(data);
    await logAuditEvent({
      userId, action: 'marketplace.tax_region.create', category: 'global',
      entityType: 'TaxRegion', entityId: taxRegion._id,
      newValue: { name: taxRegion.name, taxRate: taxRegion.taxRate, taxType: taxRegion.taxType },
      description: `Tax region "${taxRegion.name.en}" created`,
    });
    return taxRegion;
  }

  async updateTaxRegion(userId, id, data) {
    const taxRegion = await TaxRegion.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!taxRegion) throw new Error('Tax region not found');
    await logAuditEvent({
      userId, action: 'marketplace.tax_region.update', category: 'global',
      entityType: 'TaxRegion', entityId: id,
      newValue: { name: taxRegion.name, taxRate: taxRegion.taxRate },
      description: `Tax region "${taxRegion.name.en}" updated`,
    });
    return taxRegion;
  }

  async getLocalizationSettings(orgId) {
    const filter = {};
    if (orgId) filter.organization = new mongoose.Types.ObjectId(orgId);
    const settings = await LocalizationSetting.find(filter).populate('country', 'code name').populate('currency', 'code symbol').populate('holidays', 'name holidays').lean();
    return settings;
  }

  async upsertLocalizationSettings(userId, orgId, data) {
    const existing = await LocalizationSetting.findOne({ organization: orgId });
    if (existing) {
      Object.assign(existing, data);
      await existing.save();
      await logAuditEvent({
        userId, action: 'marketplace.localization.update', category: 'global',
        entityType: 'LocalizationSetting', entityId: existing._id,
        newValue: { orgId, language: data.language, timezone: data.timezone },
        description: `Localization settings updated for org ${orgId}`,
      });
      return existing;
    }
    const settings = await LocalizationSetting.create({ organization: orgId, ...data });
    await logAuditEvent({
      userId, action: 'marketplace.localization.create', category: 'global',
      entityType: 'LocalizationSetting', entityId: settings._id,
      newValue: { orgId, language: settings.language, timezone: settings.timezone },
      description: `Localization settings created for org ${orgId}`,
    });
    return settings;
  }

  async getBusinessHours(orgId) {
    const settings = await LocalizationSetting.findOne({ organization: orgId }).lean();
    if (!settings) throw new Error('Localization settings not found for this organization');
    return settings.businessHours || [];
  }

  async getHolidays(countryId, year) {
    const calendars = await HolidayCalendar.find({ country: countryId }).lean();
    const yearNum = year || new Date().getFullYear();
    const allHolidays = [];
    for (const cal of calendars) {
      for (const h of cal.holidays) {
        const holidayYear = h.date ? new Date(h.date).getFullYear() : yearNum;
        if (holidayYear === yearNum || h.isRecurring) {
          allHolidays.push({ ...h, calendarId: cal._id, calendarName: cal.name });
        }
      }
    }
    allHolidays.sort((a, b) => new Date(a.date) - new Date(b.date));
    return allHolidays;
  }

  async createHolidayCalendar(userId, data) {
    if (data.country) {
      const country = await Country.findById(data.country);
      if (!country) throw new Error('Country not found');
    }
    const calendar = await HolidayCalendar.create(data);
    await logAuditEvent({
      userId, action: 'marketplace.holiday_calendar.create', category: 'global',
      entityType: 'HolidayCalendar', entityId: calendar._id,
      newValue: { name: calendar.name, country: data.country },
      description: `Holiday calendar "${calendar.name.en}" created`,
    });
    return calendar;
  }

  async addHoliday(userId, calendarId, data) {
    const calendar = await HolidayCalendar.findById(calendarId);
    if (!calendar) throw new Error('Holiday calendar not found');
    if (!data.name || !data.date) throw new Error('Holiday name and date are required');
    calendar.holidays.push(data);
    await calendar.save();
    await logAuditEvent({
      userId, action: 'marketplace.holiday.add', category: 'global',
      entityType: 'HolidayCalendar', entityId: calendarId,
      newValue: { name: data.name, date: data.date, isRecurring: data.isRecurring },
      description: `Holiday "${data.name.en || data.name}" added to calendar`,
    });
    return calendar;
  }

  async getMarketplaceRegions() {
    const [regions, countries, currencies, taxRegions] = await Promise.all([
      Region.find({ isActive: true }).sort({ 'name.en': 1 }).lean(),
      Country.find({ isActive: true }).populate('region', 'name code').populate('currency', 'code symbol').sort({ 'name.en': 1 }).lean(),
      Currency.find({ isActive: true }).sort({ code: 1 }).lean(),
      TaxRegion.find({ isActive: true }).populate('countries', 'code name').lean(),
    ]);
    const regionBreakdown = {};
    for (const region of regions) {
      const regionCountries = countries.filter(c => c.region?._id?.toString() === region._id.toString());
      regionBreakdown[region.code] = {
        region: { _id: region._id, code: region.code, name: region.name },
        countryCount: regionCountries.length,
        countries: regionCountries,
      };
    }
    const totalCountries = countries.length;
    const totalCurrencies = currencies.length;
    return {
      totalRegions: regions.length,
      totalCountries,
      totalCurrencies,
      totalTaxRegions: taxRegions.length,
      regions: regionBreakdown,
      currencies,
      taxRegions,
      unassignedCountries: countries.filter(c => !c.region).length,
    };
  }
}

export const globalMarketplaceService = new GlobalMarketplaceService();
