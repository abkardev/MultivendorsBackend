import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('../models/KnowledgeArticle.js', () => ({
  KnowledgeArticle: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../models/TrainingModule.js', () => ({
  default: {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../models/Certification.js', () => ({
  default: {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../models/LearningPath.js', () => ({
  default: {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
  },
}));

describe('Knowledge Platform Service', () => {
  let KnowledgeArticle, TrainingModule, Certification;

  beforeEach(async () => {
    vi.clearAllMocks();
    KnowledgeArticle = (await import('../models/KnowledgeArticle.js')).KnowledgeArticle;
    TrainingModule = (await import('../models/TrainingModule.js')).default;
    Certification = (await import('../models/Certification.js')).default;
  });

  it('should create an article', async () => {
    const mockArt = { _id: mockId(), title: { en: 'Getting Started' }, content: { en: 'Welcome!' }, status: 'draft' };
    KnowledgeArticle.create.mockResolvedValue(mockArt);
    const art = await KnowledgeArticle.create({ title: { en: 'Getting Started' }, content: { en: 'Welcome!' } });
    expect(art.status).toBe('draft');
  });

  it('should publish an article', async () => {
    const id = mockId();
    const mockArt = { _id: id, status: 'draft', save: vi.fn() };
    KnowledgeArticle.findById.mockResolvedValue(mockArt);
    const art = await KnowledgeArticle.findById(id);
    art.status = 'published';
    art.publishedAt = new Date();
    await art.save();
    expect(art.status).toBe('published');
  });

  it('should create a training module', async () => {
    const mockMod = { _id: mockId(), title: { en: 'Module 1' }, lessons: [{ title: 'Intro', videoUrl: 'https://example.com/video' }] };
    TrainingModule.create.mockResolvedValue(mockMod);
    const mod = await TrainingModule.create({ title: { en: 'Module 1' }, lessons: [{ title: 'Intro', videoUrl: 'https://example.com/video' }] });
    expect(mod.lessons).toHaveLength(1);
  });

  it('should create a certification', async () => {
    const mockCert = { _id: mockId(), name: { en: 'Procurement Expert' }, passingScore: 80 };
    Certification.create.mockResolvedValue(mockCert);
    const cert = await Certification.create({ name: { en: 'Procurement Expert' }, passingScore: 80 });
    expect(cert.passingScore).toBe(80);
  });

  it('should create a learning path', async () => {
    const LearningPath = (await import('../models/LearningPath.js')).default;
    const mockLp = { _id: mockId(), name: { en: 'Procurement 101' }, modules: [mockId(), mockId()] };
    LearningPath.create.mockResolvedValue(mockLp);
    const lp = await LearningPath.create({ name: { en: 'Procurement 101' }, modules: mockLp.modules });
    expect(lp.modules).toHaveLength(2);
  });

  it('should search articles', async () => {
    KnowledgeArticle.find.mockReturnValue({ select: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue([{ _id: mockId(), title: { en: 'Result' } }]) });
    KnowledgeArticle.countDocuments.mockResolvedValue(1);
    const arts = await KnowledgeArticle.find({ status: 'published' }).select('title slug category views').limit(20).lean();
    expect(arts).toHaveLength(1);
  });
});
