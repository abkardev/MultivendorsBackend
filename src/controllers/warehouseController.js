import { Warehouse, Country } from '../models/Warehouse.js';
import { sanitizeBody } from '../utils/sanitize.js';

const ALLOWED_FIELDS = ['name', 'nameAr', 'code', 'phoneCode', 'currency', 'currencySymbol', 'isActive', 'flag'];

// --- Warehouses ---
export const listWarehouses = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role !== 'admin') filter.vendor = req.user._id;
    const warehouses = await Warehouse.find(filter).populate('vendor', 'name');
    res.json({ status: true, data: warehouses });
  } catch (error) { res.status(500).json({ status: false, message: error.message }); }
};

export const createWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.create({ ...req.body, vendor: req.user._id });
    res.status(201).json({ status: true, data: warehouse });
  } catch (error) { res.status(500).json({ status: false, message: error.message }); }
};

export const updateWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.findOneAndUpdate({ _id: req.params.id, vendor: req.user._id }, req.body, { new: true });
    if (!warehouse) return res.status(404).json({ status: false, message: 'Warehouse not found' });
    res.json({ status: true, data: warehouse });
  } catch (error) { res.status(500).json({ status: false, message: error.message }); }
};

export const deleteWarehouse = async (req, res) => {
  try {
    await Warehouse.findOneAndDelete({ _id: req.params.id, vendor: req.user._id });
    res.json({ status: true, message: 'Warehouse deleted' });
  } catch (error) { res.status(500).json({ status: false, message: error.message }); }
};

// --- Countries ---
export const listCountries = async (req, res) => {
  try {
    const countries = await Country.find({ isActive: true });
    res.json({ status: true, data: countries });
  } catch (error) { res.status(500).json({ status: false, message: error.message }); }
};

export const getAllCountries = async (req, res) => {
  try {
    const countries = await Country.find({});
    res.json({ status: true, data: countries });
  } catch (error) { res.status(500).json({ status: false, message: error.message }); }
};

export const createCountry = async (req, res) => {
  try {
    const country = await Country.create(sanitizeBody(req.body, ALLOWED_FIELDS));
    res.status(201).json({ status: true, data: country });
  } catch (error) { res.status(500).json({ status: false, message: error.message }); }
};

export const updateCountry = async (req, res) => {
  try {
    const country = await Country.findByIdAndUpdate(req.params.id, sanitizeBody(req.body, ALLOWED_FIELDS), { new: true });
    if (!country) return res.status(404).json({ status: false, message: 'Country not found' });
    res.json({ status: true, data: country });
  } catch (error) { res.status(500).json({ status: false, message: error.message }); }
};

export const deleteCountry = async (req, res) => {
  try {
    await Country.findByIdAndDelete(req.params.id);
    res.json({ status: true, message: 'Country deleted' });
  } catch (error) { res.status(500).json({ status: false, message: error.message }); }
};

export const seedCountries = async (req, res) => {
  try {
    const defaults = [
      { code: 'SA', name: { en: 'Saudi Arabia', ar: 'المملكة العربية السعودية' }, currency: { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' }, phoneCode: '+966', isActive: true, settings: { taxRate: 15, defaultLanguage: 'ar' } },
      { code: 'AE', name: { en: 'United Arab Emirates', ar: 'الإمارات العربية المتحدة' }, currency: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' }, phoneCode: '+971', isActive: true, settings: { taxRate: 5, defaultLanguage: 'en' } },
      { code: 'KW', name: { en: 'Kuwait', ar: 'الكويت' }, currency: { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar' }, phoneCode: '+965', isActive: false, settings: { taxRate: 0, defaultLanguage: 'ar' } },
      { code: 'QA', name: { en: 'Qatar', ar: 'قطر' }, currency: { code: 'QAR', symbol: 'ر.ق', name: 'Qatari Riyal' }, phoneCode: '+974', isActive: false, settings: { taxRate: 0, defaultLanguage: 'ar' } },
      { code: 'OM', name: { en: 'Oman', ar: 'عمان' }, currency: { code: 'OMR', symbol: 'ر.ع.', name: 'Omani Rial' }, phoneCode: '+968', isActive: false, settings: { taxRate: 0, defaultLanguage: 'ar' } },
      { code: 'BH', name: { en: 'Bahrain', ar: 'البحرين' }, currency: { code: 'BHD', symbol: 'د.ب', name: 'Bahraini Dinar' }, phoneCode: '+973', isActive: false, settings: { taxRate: 0, defaultLanguage: 'en' } },
      { code: 'EG', name: { en: 'Egypt', ar: 'مصر' }, currency: { code: 'EGP', symbol: 'ج.م', name: 'Egyptian Pound' }, phoneCode: '+20', isActive: false, settings: { taxRate: 14, defaultLanguage: 'ar' } },
    ];
    for (const c of defaults) {
      await Country.findOneAndUpdate({ code: c.code }, { $setOnInsert: c }, { upsert: true });
    }
    res.json({ status: true, message: 'Countries seeded' });
  } catch (error) { res.status(500).json({ status: false, message: error.message }); }
};
