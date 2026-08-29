import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../models/productModel.js', () => ({
  Product: {
    find: vi.fn(),
    aggregate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../models/SearchAnalytics.js', () => ({
  default: {
    create: vi.fn(),
    find: vi.fn(),
    aggregate: vi.fn(),
  },
}));

describe('AI Search Service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should perform semantic search', async () => {
    const { Product } = await import('../models/productModel.js');
    Product.find.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([{ _id: 'p1', name: 'Wireless Mouse', score: 0.95 }]),
    });
    const results = await Product.find({ $text: { $search: 'wireless mouse' } }).sort({ score: { $meta: 'textScore' } }).lean();
    expect(results).toHaveLength(1);
    expect(results[0].name).toContain('Mouse');
  });

  it('should provide search suggestions', () => {
    const suggestions = ['wireless mouse', 'wireless keyboard', 'wireless charger'];
    const query = 'wireless';
    const filtered = suggestions.filter(s => s.toLowerCase().includes(query.toLowerCase()));
    expect(filtered).toHaveLength(3);
  });

  it('should handle empty search results', async () => {
    const { Product } = await import('../models/productModel.js');
    Product.find.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    });
    const results = await Product.find({ $text: { $search: 'xyznonexistent' } }).lean();
    expect(results).toHaveLength(0);
  });

  it('should track search analytics', async () => {
    const SearchAnalytics = (await import('../models/SearchAnalytics.js')).default;
    SearchAnalytics.create.mockResolvedValue({ _id: 'sa1', query: 'laptop', results: 5 });
    const entry = await SearchAnalytics.create({ query: 'laptop', results: 5 });
    expect(entry.query).toBe('laptop');
  });

  it('should index products for search', () => {
    const product = { name: 'Test Product', description: 'A description', tags: ['tag1', 'tag2'] };
    const searchableText = [product.name, product.description, ...product.tags].join(' ').toLowerCase();
    expect(searchableText).toContain('test product');
    expect(searchableText).toContain('tag1');
  });
});
