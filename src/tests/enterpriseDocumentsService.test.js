import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('../models/Document.js', () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../models/DocumentFolder.js', () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../models/DocumentVersion.js', () => ({
  default: {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
  },
}));

describe('Enterprise Documents Service', () => {
  let Document, DocumentFolder;

  beforeEach(async () => {
    vi.clearAllMocks();
    Document = (await import('../models/Document.js')).default;
    DocumentFolder = (await import('../models/DocumentFolder.js')).default;
  });

  it('should create a folder', async () => {
    const mockF = { _id: mockId(), name: 'Contracts', createdBy: mockId() };
    DocumentFolder.create.mockResolvedValue(mockF);
    const f = await DocumentFolder.create({ name: 'Contracts', createdBy: mockF.createdBy });
    expect(f.name).toBe('Contracts');
  });

  it('should create a document in a folder', async () => {
    const mockDoc = { _id: mockId(), folder: mockId(), name: 'Agreement.pdf', mimeType: 'application/pdf', size: 1024 };
    Document.create.mockResolvedValue(mockDoc);
    const doc = await Document.create({ folder: mockDoc.folder, name: 'Agreement.pdf', mimeType: 'application/pdf', size: 1024 });
    expect(doc.name).toBe('Agreement.pdf');
  });

  it('should create a new document version', async () => {
    const DocumentVersion = (await import('../models/DocumentVersion.js')).default;
    const mockVer = { _id: mockId(), document: mockId(), version: 2, fileUrl: '/files/v2/doc.pdf' };
    DocumentVersion.create.mockResolvedValue(mockVer);
    const ver = await DocumentVersion.create({ document: mockVer.document, version: 2, fileUrl: '/files/v2/doc.pdf' });
    expect(ver.version).toBe(2);
  });

  it('should list root folders', async () => {
    DocumentFolder.find.mockResolvedValue([{ _id: mockId(), name: 'Folder 1', parent: null }]);
    const folders = await DocumentFolder.find({ parent: { $exists: false } });
    expect(folders).toHaveLength(1);
  });

  it('should list documents by folder', async () => {
    const folderId = mockId();
    Document.find.mockReturnValue({ sort: vi.fn().mockResolvedValue([{ _id: mockId(), folder: folderId }]) });
    const docs = await Document.find({ folder: folderId }).sort({ createdAt: -1 });
    expect(docs).toHaveLength(1);
  });
});
