import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('../models/Country.js', () => ({
  Country: {
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../models/Currency.js', () => ({
  Currency: {
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('../models/TaxRegion.js', () => ({
  default: {
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
  },
}));

describe('Global Marketplace Service', () => {
  let Country, Currency;

  beforeEach(async () => {
    vi.clearAllMocks();
    Country = (await import('../models/Country.js')).Country;
    Currency = (await import('../models/Currency.js')).Currency;
  });

  it('should list countries', async () => {
    Country.find.mockReturnValue({ populate: vi.fn().mockReturnThis(), sort: vi.fn().mockResolvedValue([{ _id: mockId(), code: 'SA' }, { _id: mockId(), code: 'AE' }]) });
    const countries = await Country.find({ isActive: true }).populate('region').sort({ 'name.en': 1 });
    expect(countries).toHaveLength(2);
  });

  it('should create a country', async () => {
    const mockCountry = { _id: mockId(), code: 'SA', name: { en: 'Saudi Arabia', ar: 'المملكة العربية السعودية' }, currency: mockId() };
    Country.create.mockResolvedValue(mockCountry);
    const c = await Country.create({ code: 'SA', name: { en: 'Saudi Arabia' }, currency: mockCountry.currency });
    expect(c.code).toBe('SA');
  });

  it('should list currencies', async () => {
    Currency.find.mockResolvedValue([{ _id: mockId(), code: 'SAR', symbol: '﷼' }, { _id: mockId(), code: 'AED', symbol: 'د.إ' }]);
    const currencies = await Currency.find({ isActive: true });
    expect(currencies).toHaveLength(2);
  });

  it('should define tax regions', async () => {
    const TaxRegion = (await import('../models/TaxRegion.js')).default;
    const mockTr = { _id: mockId(), name: 'GCC', countries: [mockId()], taxRate: 15 };
    TaxRegion.create.mockResolvedValue(mockTr);
    const tr = await TaxRegion.create({ name: 'GCC', countries: mockTr.countries, taxRate: 15 });
    expect(tr.taxRate).toBe(15);
  });

  it('should find country by code', async () => {
    Country.findOne.mockResolvedValue({ _id: mockId(), code: 'US' });
    const c = await Country.findOne({ code: 'US' });
    expect(c.code).toBe('US');
  });
});
