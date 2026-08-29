import { MessageChannel } from '../models/MessageChannel.js';
import { MessageThread } from '../models/MessageThread.js';
import { Message } from '../models/Message.js';
import { MessageReaction } from '../models/MessageReaction.js';
import { ActivityFeed } from '../models/ActivityFeed.js';
import { logAuditEvent, generateCorrelationId } from './auditService.js';

class CommunicationCenterService {
  async getChannels(orgId) {
    return MessageChannel.find({ organization: orgId, isArchived: false })
      .populate('members.user', 'name email avatar')
      .sort({ updatedAt: -1 })
      .lean();
  }

  async createChannel(userId, data) {
    const channel = await MessageChannel.create({
      ...data,
      members: [{ user: userId, role: 'admin', joinedAt: new Date() }],
    });
    await logAuditEvent({
      userId, action: 'create', category: 'communication',
      entityType: 'message_channel', entityId: channel._id,
      newValue: { name: channel.name, type: channel.type },
      description: `Created ${channel.type} channel: ${channel.name}`,
    });
    return channel;
  }

  async getChannel(id) {
    const channel = await MessageChannel.findById(id)
      .populate('members.user', 'name email avatar')
      .lean();
    if (!channel) throw new Error('Channel not found');
    return channel;
  }

  async updateChannel(userId, id, data) {
    const channel = await MessageChannel.findById(id);
    if (!channel) throw new Error('Channel not found');
    const old = { name: channel.name, topic: channel.topic };
    Object.assign(channel, data);
    await channel.save();
    await logAuditEvent({
      userId, action: 'update', category: 'communication',
      entityType: 'message_channel', entityId: id,
      oldValue: old, newValue: data,
      description: `Updated channel: ${channel.name}`,
    });
    return channel;
  }

  async deleteChannel(userId, id) {
    const channel = await MessageChannel.findById(id);
    if (!channel) throw new Error('Channel not found');
    channel.isArchived = true;
    await channel.save();
    await logAuditEvent({
      userId, action: 'delete', category: 'communication',
      entityType: 'message_channel', entityId: id,
      description: `Archived channel: ${channel.name}`,
    });
    return { success: true };
  }

  async addChannelMember(userId, channelId, memberId, role = 'member') {
    const channel = await MessageChannel.findById(channelId);
    if (!channel) throw new Error('Channel not found');
    if (channel.members.some(m => m.user.toString() === memberId)) {
      throw new Error('Member already in channel');
    }
    channel.members.push({ user: memberId, role, joinedAt: new Date() });
    await channel.save();
    await logAuditEvent({
      userId, action: 'add_member', category: 'communication',
      entityType: 'message_channel', entityId: channelId,
      newValue: { memberId, role },
      description: `Added member ${memberId} to ${channel.name}`,
    });
    return channel;
  }

  async removeChannelMember(userId, channelId, memberId) {
    const channel = await MessageChannel.findById(channelId);
    if (!channel) throw new Error('Channel not found');
    channel.members = channel.members.filter(m => m.user.toString() !== memberId);
    await channel.save();
    await logAuditEvent({
      userId, action: 'remove_member', category: 'communication',
      entityType: 'message_channel', entityId: channelId,
      oldValue: { memberId },
      description: `Removed member ${memberId} from ${channel.name}`,
    });
    return channel;
  }

  async getThreads(channelId) {
    return MessageThread.find({ channel: channelId })
      .populate('createdBy', 'name email avatar')
      .populate('participants', 'name email avatar')
      .sort({ lastActivityAt: -1 })
      .lean();
  }

  async createThread(userId, data) {
    const thread = await MessageThread.create({
      ...data,
      createdBy: userId,
      participants: [userId],
    });
    await logAuditEvent({
      userId, action: 'create', category: 'communication',
      entityType: 'message_thread', entityId: thread._id,
      newValue: { subject: thread.subject, channel: data.channel },
      description: `Created thread: ${thread.subject}`,
    });
    return thread;
  }

  async getMessages(channelId, filters = {}) {
    const { page = 1, limit = 50, thread, before, after } = filters;
    const query = { channel: channelId, deletedAt: null };
    if (thread) query.thread = thread;
    if (before) query.createdAt = { $lt: new Date(before) };
    if (after) query.createdAt = { ...query.createdAt, $gt: new Date(after) };
    const skip = (page - 1) * limit;
    const [messages, total] = await Promise.all([
      Message.find(query)
        .populate('sender', 'name email avatar')
        .populate('mentions', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip).limit(limit)
        .lean(),
      Message.countDocuments(query),
    ]);
    const messageIds = messages.map(m => m._id);
    const reactions = await MessageReaction.find({ message: { $in: messageIds } })
      .populate('user', 'name email')
      .lean();
    const reactionMap = {};
    for (const r of reactions) {
      if (!reactionMap[r.message]) reactionMap[r.message] = [];
      reactionMap[r.message].push(r);
    }
    const enriched = messages.map(m => ({ ...m, reactions: reactionMap[m._id] || [] }));
    return { messages: enriched, total, page, totalPages: Math.ceil(total / limit) };
  }

  async sendMessage(userId, data) {
    const message = await Message.create({
      ...data,
      sender: userId,
      mentions: data.mentions || [],
      attachments: data.attachments || [],
    });
    await MessageThread.updateOne(
      { _id: data.thread },
      { $set: { lastActivityAt: new Date() }, $addToSet: { participants: userId } },
    );
    await ActivityFeed.create({
      organization: data.organization,
      actor: userId,
      action: 'message_sent',
      targetType: 'message',
      targetId: message._id,
      context: { channel: data.channel, thread: data.thread, preview: data.content?.substring(0, 100) },
    });
    await logAuditEvent({
      userId, action: 'send', category: 'communication',
      entityType: 'message', entityId: message._id,
      description: 'Sent a message',
    });
    return message;
  }

  async editMessage(userId, id, content) {
    const message = await Message.findOne({ _id: id, sender: userId, deletedAt: null });
    if (!message) throw new Error('Message not found or unauthorized');
    message.content = content;
    message.editedAt = new Date();
    await message.save();
    await logAuditEvent({
      userId, action: 'edit', category: 'communication',
      entityType: 'message', entityId: id,
      description: 'Edited a message',
    });
    return message;
  }

  async deleteMessage(userId, id) {
    const message = await Message.findOne({ _id: id, sender: userId, deletedAt: null });
    if (!message) throw new Error('Message not found or unauthorized');
    message.deletedAt = new Date();
    await message.save();
    await logAuditEvent({
      userId, action: 'delete', category: 'communication',
      entityType: 'message', entityId: id,
      description: 'Deleted a message',
    });
    return { success: true };
  }

  async addReaction(userId, messageId, emoji) {
    const [reaction] = await MessageReaction.findOrBuild?.({ message: messageId, user: userId, emoji }) ||
      await MessageReaction.create({ message: messageId, user: userId, emoji }).catch(() => null);
    if (!reaction) {
      const existing = await MessageReaction.findOneAndUpdate(
        { message: messageId, user: userId, emoji },
        { $setOnInsert: { message: messageId, user: userId, emoji } },
        { upsert: true, new: true },
      );
      return existing;
    }
    return reaction;
  }

  async removeReaction(userId, messageId, emoji) {
    await MessageReaction.deleteOne({ message: messageId, user: userId, emoji });
    return { success: true };
  }

  async pinMessage(userId, messageId) {
    const message = await Message.findById(messageId);
    if (!message) throw new Error('Message not found');
    message.isPinned = true;
    await message.save();
    await logAuditEvent({
      userId, action: 'pin', category: 'communication',
      entityType: 'message', entityId: messageId,
      description: 'Pinned a message',
    });
    return message;
  }

  async unpinMessage(userId, messageId) {
    const message = await Message.findById(messageId);
    if (!message) throw new Error('Message not found');
    message.isPinned = false;
    await message.save();
    await logAuditEvent({
      userId, action: 'unpin', category: 'communication',
      entityType: 'message', entityId: messageId,
      description: 'Unpinned a message',
    });
    return message;
  }

  async getActivityFeed(orgId, filters = {}) {
    const { page = 1, limit = 50, action, workspace, startDate, endDate } = filters;
    const query = { organization: orgId };
    if (action) query.action = action;
    if (workspace) query.workspace = workspace;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    const skip = (page - 1) * limit;
    const [activities, total] = await Promise.all([
      ActivityFeed.find(query)
        .populate('actor', 'name email avatar')
        .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ActivityFeed.countDocuments(query),
    ]);
    return { activities, total, page, totalPages: Math.ceil(total / limit) };
  }

  async createActivityEvent(userId, data) {
    const event = await ActivityFeed.create({ ...data, actor: userId });
    return event;
  }

  async markAsRead(userId, channelId) {
    await MessageChannel.updateOne(
      { _id: channelId, 'members.user': userId },
      { $set: { 'members.$.lastReadAt': new Date() } },
    );
    return { success: true };
  }

  async getUnreadCount(userId) {
    const channels = await MessageChannel.find({ 'members.user': userId }).lean();
    let totalUnread = 0;
    for (const channel of channels) {
      const member = channel.members.find(m => m.user.toString() === userId);
      const lastRead = member?.lastReadAt || new Date(0);
      const count = await Message.countDocuments({
        channel: channel._id,
        sender: { $ne: userId },
        deletedAt: null,
        createdAt: { $gt: lastRead },
      });
      totalUnread += count;
    }
    return { total: totalUnread };
  }

  async searchMessages(orgId, query) {
    const channels = await MessageChannel.find({ organization: orgId, isArchived: false }).distinct('_id');
    return Message.find({
      channel: { $in: channels },
      deletedAt: null,
      $text: { $search: query },
    })
      .populate('sender', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
  }
}

export const communicationCenterService = new CommunicationCenterService();
