import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema({
  name: {
    en: { type: String, required: true },
    ar: { type: String },
  },
  date: { type: Date, required: true },
  isRecurring: { type: Boolean, default: false },
  type: { type: String },
}, { _id: false });

const holidayCalendarSchema = new mongoose.Schema({
  name: {
    en: { type: String, required: true },
    ar: { type: String },
  },
  country: { type: mongoose.Schema.Types.ObjectId, ref: 'Country' },
  holidays: [holidaySchema],
}, { timestamps: true, toJSON: { virtuals: true } });

holidayCalendarSchema.index({ country: 1 });

export const HolidayCalendar = mongoose.model('HolidayCalendar', holidayCalendarSchema);
