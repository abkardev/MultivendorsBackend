import { Currency, ExchangeRate } from '../models/Currency.js';

export class CurrencyEngine {
  async convert(amount, from, to) {
    if (from === to) return { amount, rate: 1 };
    const rate = await ExchangeRate.findOne({ from: from.toUpperCase(), to: to.toUpperCase() }).sort({ date: -1 });
    if (!rate) throw new Error(`No exchange rate found for ${from}->${to}`);
    return { amount: +(amount * rate.rate).toFixed(2), rate: rate.rate };
  }

  async getActiveCurrencies() {
    return Currency.find({ isActive: true }).lean();
  }

  async getDefaultCurrency() {
    return Currency.findOne({ isDefault: true }).lean();
  }

  async updateRate(from, to, rate, source = 'manual') {
    const existing = await ExchangeRate.findOneAndUpdate(
      { from: from.toUpperCase(), to: to.toUpperCase(), date: { $gte: new Date().setHours(0, 0, 0, 0) } },
      { rate, source },
      { upsert: true, new: true },
    );
    await Currency.findOneAndUpdate({ code: from }, { exchangeRateToBase: rate, updatedAt: new Date() });
    return existing;
  }
}

export const currencyEngine = new CurrencyEngine();
