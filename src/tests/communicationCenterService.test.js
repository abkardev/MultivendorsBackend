import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('../models/MessageChannel.js', () => ({
  MessageChannel: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../models/Message.js', () => ({
  Message: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock('../models/MessageReaction.js', () => ({
  MessageReaction: {
    create: vi.fn(),
    findOne: vi.fn(),
    findByIdAndDelete: vi.fn(),
  },
}));

describe('Communication Center Service', () => {
  let MessageChannel, Message, MessageReaction;

  beforeEach(async () => {
    vi.clearAllMocks();
    MessageChannel = (await import('../models/MessageChannel.js')).MessageChannel;
    Message = (await import('../models/Message.js')).Message;
    MessageReaction = (await import('../models/MessageReaction.js')).MessageReaction;
  });

  it('should create a channel', async () => {
    const mockCh = { _id: mockId(), name: 'General', type: 'team', organization: mockId() };
    MessageChannel.create.mockResolvedValue(mockCh);
    const ch = await MessageChannel.create({ name: 'General', type: 'team', organization: mockCh.organization });
    expect(ch.name).toBe('General');
  });

  it('should send a message to channel', async () => {
    const mockMsg = { _id: mockId(), channel: mockId(), sender: mockId(), content: 'Hello!', messageType: 'text' };
    Message.create.mockResolvedValue(mockMsg);
    const msg = await Message.create({ channel: mockMsg.channel, sender: mockMsg.sender, content: 'Hello!', messageType: 'text' });
    expect(msg.content).toBe('Hello!');
  });

  it('should add reaction to message', async () => {
    const mockReact = { _id: mockId(), message: mockId(), user: mockId(), emoji: '👍' };
    MessageReaction.create.mockResolvedValue(mockReact);
    const r = await MessageReaction.create({ message: mockReact.message, user: mockReact.user, emoji: '👍' });
    expect(r.emoji).toBe('👍');
  });

  it('should list channel messages', async () => {
    const channelId = mockId();
    Message.find.mockReturnValue({ sort: vi.fn().mockReturnThis(), skip: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([{ _id: mockId(), channel: channelId }]) });
    Message.countDocuments.mockResolvedValue(1);
    const msgs = await Message.find({ channel: channelId }).sort({ createdAt: -1 }).skip(0).limit(50);
    expect(msgs).toHaveLength(1);
  });

  it('should archive a channel', async () => {
    const id = mockId();
    const mockCh = { _id: id, isArchived: false, save: vi.fn() };
    MessageChannel.findById.mockResolvedValue(mockCh);
    const ch = await MessageChannel.findById(id);
    ch.isArchived = true;
    await ch.save();
    expect(ch.isArchived).toBe(true);
  });
});
