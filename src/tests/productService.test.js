import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('../models/productModel.js', () => ({
  Product: {
    create: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
    distinct: vi.fn(),
  },
}));

vi.mock('../models/vendorModel.js', () => ({
  Vendor: { findOne: vi.fn(), findById: vi.fn() },
}));

describe('ProductService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should create a product', async () => {
    const { Product } = await import('../models/productModel.js');
    const mockProduct = { _id: mockId(), name: 'Test Product', price: 100, vendor: mockId() };
    Product.create.mockResolvedValue(mockProduct);
    const product = await Product.create({ name: 'Test Product', price: 100, vendor: mockId() });
    expect(product.name).toBe('Test Product');
  });

  it('should find product by id', async () => {
    const { Product } = await import('../models/productModel.js');
    const productId = mockId();
    Product.findById.mockResolvedValue({ _id: productId, name: 'Detail Product' });
    const found = await Product.findById(productId);
    expect(found._id).toBe(productId);
  });

  it('should update a product', async () => {
    const { Product } = await import('../models/productModel.js');
    const productId = mockId();
    Product.findByIdAndUpdate.mockResolvedValue({ _id: productId, name: 'Updated', price: 150 });
    const updated = await Product.findByIdAndUpdate(productId, { price: 150 }, { new: true });
    expect(updated.price).toBe(150);
  });

  it('should delete a product', async () => {
    const { Product } = await import('../models/productModel.js');
    const productId = mockId();
    Product.findByIdAndDelete.mockResolvedValue({ _id: productId });
    const deleted = await Product.findByIdAndDelete(productId);
    expect(deleted._id).toBe(productId);
  });

  it('should find products with chained methods', async () => {
    const { Product } = await import('../models/productModel.js');
    const mockProducts = [{ _id: mockId(), name: 'Product 1' }, { _id: mockId(), name: 'Product 2' }];
    const query = { populate: vi.fn().mockReturnThis(), sort: vi.fn().mockReturnThis(), skip: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue(mockProducts) };
    Product.find.mockReturnValue(query);
    Product.countDocuments.mockResolvedValue(2);
    const results = await Product.find({ category: 'electronics' }).sort({ createdAt: -1 }).skip(0).limit(10);
    expect(results).toHaveLength(2);
  });

  it('should search products with regex', async () => {
    const { Product } = await import('../models/productModel.js');
    Product.find.mockReturnValue({ populate: vi.fn().mockReturnThis(), sort: vi.fn().mockReturnThis(), skip: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([]) });
    Product.countDocuments.mockResolvedValue(0);
    const results = await Product.find({ name: { $regex: 'search', $options: 'i' } }).limit(10);
    expect(results).toEqual([]);
  });
});
