import { Setting } from '../models/Setting.js';
import { settingsService } from '../services/settingsService.js';
import { sanitizeBody } from '../utils/sanitize.js';

const ALLOWED_FIELDS = ['key', 'value', 'category', 'type', 'label', 'description', 'isPublic', 'order', 'options'];

export const listSettings = async (req, res) => {
  try {
    const { category } = req.query;
    let settings;
    if (category) {
      settings = await settingsService.getByCategory(category);
    } else {
      settings = await settingsService.getAllGrouped();
    }
    res.json({ status: true, data: settings });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getSetting = async (req, res) => {
  try {
    const setting = await settingsService.get(req.params.key);
    if (!setting) return res.status(404).json({ status: false, message: 'Setting not found' });
    res.json({ status: true, data: setting });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const updateSetting = async (req, res) => {
  try {
    const { value } = req.body;
    const setting = await settingsService.set(req.params.key, value);
    if (!setting) return res.status(404).json({ status: false, message: 'Setting not found' });
    res.json({ status: true, data: setting });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const createSetting = async (req, res) => {
  try {
    const setting = await Setting.create(sanitizeBody(req.body, ALLOWED_FIELDS));
    settingsService.invalidateCache();
    res.status(201).json({ status: true, data: setting });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const deleteSetting = async (req, res) => {
  try {
    await settingsService.delete(req.params.key);
    res.json({ status: true, message: 'Setting deleted' });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getPublicSettings = async (req, res) => {
  try {
    const settings = await settingsService.getPublic();
    res.json({ status: true, data: settings });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const seedDefaultSettings = async (req, res) => {
  try {
    const defaults = [
      { key: 'platform_name', value: 'B2B Market', type: 'string', label: { en: 'Platform Name', ar: 'اسم المنصة' }, category: 'general', isPublic: true },
      { key: 'platform_tagline', value: 'Connect with trusted suppliers', type: 'string', label: { en: 'Platform Tagline', ar: 'شعار المنصة' }, category: 'general', isPublic: true },
      { key: 'support_email', value: 'support@b2bmarket.com', type: 'string', label: { en: 'Support Email', ar: 'بريد الدعم' }, category: 'general' },
      { key: 'commission_rate', value: 5, type: 'number', label: { en: 'Default Commission Rate (%)', ar: 'نسبة العمولة الافتراضية (%)' }, category: 'commission' },
      { key: 'vendor_verification_required', value: true, type: 'boolean', label: { en: 'Require Vendor Verification', ar: 'اشتراط توثيق الموردين' }, category: 'verification' },
      { key: 'max_products_free_tier', value: 10, type: 'number', label: { en: 'Max Products (Free Tier)', ar: 'الحد الأقصى للمنتجات (الخطة المجانية)' }, category: 'marketplace' },
      { key: 'auto_approve_reviews', value: false, type: 'boolean', label: { en: 'Auto-Approve Reviews', ar: 'موافقة تلقائية على التقييمات' }, category: 'marketplace' },
      { key: 'currency', value: 'SAR', type: 'string', label: { en: 'Default Currency', ar: 'العملة الافتراضية' }, category: 'localization', isPublic: true },
      { key: 'timezone', value: 'Asia/Riyadh', type: 'string', label: { en: 'Default Timezone', ar: 'المنطقة الزمنية الافتراضية' }, category: 'localization' },
      { key: 'enable_escrow', value: true, type: 'boolean', label: { en: 'Enable Escrow Payments', ar: 'تفعيل مدفوعات الضمان' }, category: 'payment' },
      { key: 'max_file_upload_mb', value: 10, type: 'number', label: { en: 'Max File Upload (MB)', ar: 'الحد الأقصى لرفع الملفات (ميجابايت)' }, category: 'general' },
      { key: 'maintenance_mode', value: false, type: 'boolean', label: { en: 'Maintenance Mode', ar: 'وضع الصيانة' }, category: 'general' },
      { key: 'new_registrations_open', value: true, type: 'boolean', label: { en: 'Allow New Registrations', ar: 'السماح بالتسجيلات الجديدة' }, category: 'security' },
      { key: 'whatsapp_provider', value: process.env.WHATSAPP_PROVIDER || 'log', type: 'string', label: { en: 'WhatsApp Provider', ar: 'مزود واتساب' }, category: 'integration' },
      { key: 'ai_provider', value: process.env.AI_PROVIDER || 'builtin', type: 'string', label: { en: 'AI Provider', ar: 'مزود الذكاء الاصطناعي' }, category: 'integration' },
    ];

    for (const def of defaults) {
      await Setting.findOneAndUpdate(
        { key: def.key },
        { $setOnInsert: def },
        { upsert: true },
      );
    }

    settingsService.invalidateCache();
    res.json({ status: true, message: 'Default settings seeded' });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};
