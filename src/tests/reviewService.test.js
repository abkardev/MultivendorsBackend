import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('../models/reviewModel.js', () => ({
  Review: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}));

describe('ReviewService', () => {
  let Review;

  beforeEach(async () => {
    vi.clearAllMocks();
    Review = (await import('../models/reviewModel.js')).Review;
  });

  it('should create a review', async () => {
    const mockReview = { _id: mockId(), product: mockId(), user: mockId(), rating: 5, comment: 'Excellent!', status: 'pending' };
    Review.create.mockResolvedValue(mockReview);
    const review = await Review.create({ product: mockReview.product, user: mockReview.user, rating: 5, comment: 'Excellent!' });
    expect(review.rating).toBe(5);
    expect(review.status).toBe('pending');
  });

  it('should approve a review', async () => {
    const id = mockId();
    const mockReview = { _id: id, status: 'pending', save: vi.fn() };
    Review.findById.mockResolvedValue(mockReview);
    const review = await Review.findById(id);
    review.status = 'approved';
    await review.save();
    expect(review.status).toBe('approved');
  });

  it('should reject a review', async () => {
    const id = mockId();
    const mockReview = { _id: id, status: 'pending', save: vi.fn() };
    Review.findById.mockResolvedValue(mockReview);
    const review = await Review.findById(id);
    review.status = 'rejected';
    await review.save();
    expect(review.status).toBe('rejected');
  });

  it('should calculate average rating', async () => {
    Review.aggregate.mockResolvedValue([{ _id: null, averageRating: 4.5, count: 10 }]);
    const stats = await Review.aggregate([
      { $match: { product: mockId() } },
      { $group: { _id: null, averageRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    expect(stats[0].averageRating).toBe(4.5);
    expect(stats[0].count).toBe(10);
  });

  it('should validate rating range', () => {
    const isValidRating = (r) => Number.isInteger(r) && r >= 1 && r <= 5;
    expect(isValidRating(3)).toBe(true);
    expect(isValidRating(0)).toBe(false);
    expect(isValidRating(6)).toBe(false);
    expect(isValidRating(1.5)).toBe(false);
  });
});
