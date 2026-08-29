import mongoose from 'mongoose';

const businessHourSchema = new mongoose.Schema({
  day: { type: String },
  open: { type: String },
  close: { type: String },
  isOff: { type: Boolean, default: false },
}, { _id: false });

const localizationSettingSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId },
  country: { type: mongoose.Schema.Types.ObjectId, ref: 'Country' },
  language: { type: String },
  currency: { type: mongoose.Schema.Types.ObjectId, ref: 'Currency' },
  timezone: { type: String },
  dateFormat: { type: String },
  numberFormat: { type: String },
  businessHours: [businessHourSchema],
  holidays: [{ type: mongoose.Schema.Types.ObjectId, ref: 'HolidayCalendar' }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true, toJSON: { virtuals: true } });

localizationSettingSchema.index({ organization: 1 });
localizationSettingSchema.index({ country: 1 });
localizationSettingSchema.index({ currency: 1 });

export const LocalizationSetting = mongoose.model('LocalizationSetting', localizationSettingSchema);
