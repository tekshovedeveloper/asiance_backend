import { ForbiddenException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { slugify } from '../common/slug';
import { User, UserDocument } from '../users/user.schema';
import { Activity, ActivityDocument } from './activity.schema';
import { Favorite, FavoriteDocument } from './favorite.schema';
import { FileAsset, FileAssetDocument } from './file-asset.schema';
import { ForumThread, ForumThreadDocument } from './forum-thread.schema';
import { Friendship, FriendshipDocument } from './friendship.schema';
import { Group, GroupDocument } from './group.schema';
import { GroupType, GroupTypeDocument } from './group-type.schema';
import { ActivityCommentDto, ActivityDto, ActivityUpdateDto, FileAssetDto, ForumThreadDto, GroupDto, GroupTypeDto, MessageDto } from './dto';
import { MessageThread, MessageThreadDocument } from './message-thread.schema';
import { Notification, NotificationDocument } from './notification.schema';
import { PostMedia, PostMediaDocument } from './post-media.schema';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class CommunityService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<GroupDocument>,
    @InjectModel(GroupType.name) private readonly groupTypeModel: Model<GroupTypeDocument>,
    @InjectModel(Activity.name) private readonly activityModel: Model<ActivityDocument>,
    @InjectModel(ForumThread.name) private readonly threadModel: Model<ForumThreadDocument>,
    @InjectModel(FileAsset.name) private readonly fileModel: Model<FileAssetDocument>,
    @InjectModel(MessageThread.name) private readonly messageModel: Model<MessageThreadDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Notification.name) private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(Favorite.name) private readonly favoriteModel: Model<FavoriteDocument>,
    @InjectModel(Friendship.name) private readonly friendshipModel: Model<FriendshipDocument>,
    @InjectModel(PostMedia.name) private readonly postMediaModel: Model<PostMediaDocument>,
    @Inject(forwardRef(() => ChatGateway)) private readonly chatGateway: ChatGateway,
  ) {}

  // ─── Group Types ──────────────────────────────────────────────────────────────

  async listGroupTypes() {
    return this.groupTypeModel.find().sort({ name: 1 }).lean();
  }

  async createGroupType(dto: GroupTypeDto) {
    return this.groupTypeModel.create({
      ...dto,
      slug: dto.slug || slugify(dto.name),
    });
  }

  async updateGroupType(id: string, dto: Partial<GroupTypeDto>) {
    const update = {
      ...dto,
      ...(dto.name && !dto.slug ? { slug: slugify(dto.name) } : {}),
    };
    const groupType = await this.groupTypeModel.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!groupType) throw new NotFoundException('Group type not found.');
    return groupType;
  }

  async deleteGroupType(id: string) {
    await this.groupTypeModel.findByIdAndDelete(id);
    return { ok: true };
  }

  // ─── Groups ───────────────────────────────────────────────────────────────────

  async listGroups(options: { q?: string; category?: string } = {}) {
    const query: any = {};
    if (options.category) query.category = new RegExp(options.category, 'i');
    if (options.q) {
      query.$or = [
        { name: new RegExp(options.q, 'i') },
        { description: new RegExp(options.q, 'i') },
        { category: new RegExp(options.q, 'i') },
      ];
    }
    const raw = await this.groupModel.find(query).sort({ membersCount: -1, createdAt: -1 }).limit(100).lean();
    return raw.map((g) => ({ ...g, membersCount: g.members?.length ?? 0 }));
  }

  async listMyGroups(userId: string) {
    const raw = await this.groupModel
      .find({ members: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean();
    return raw.map((g) => ({ ...g, membersCount: g.members?.length ?? 0 }));
  }

  async findGroup(slug: string) {
    const group = await this.groupModel.findOne({ slug }).lean();
    if (!group) throw new NotFoundException('Circle not found.');
    // Always reflect actual member array length so stale membersCount never shows
    return { ...group, membersCount: group.members?.length ?? 0 };
  }

  async createGroup(dto: GroupDto) {
    return this.groupModel.create({
      ...dto,
      slug: dto.slug || slugify(dto.name),
      membersCount: 0,
    });
  }

  async updateGroup(slug: string, dto: Partial<GroupDto>) {
    const update = {
      ...dto,
      ...(dto.name && !dto.slug ? { slug: slugify(dto.name) } : {}),
    };
    const group = await this.groupModel.findOneAndUpdate({ slug }, update, { new: true }).lean();
    if (!group) throw new NotFoundException('Circle not found.');
    return group;
  }

  async deleteGroup(slug: string) {
    const group = await this.groupModel.findOneAndDelete({ slug });
    if (!group) throw new NotFoundException('Circle not found.');
    await this.activityModel.deleteMany({ groupSlug: slug });
    return { ok: true };
  }

  async joinGroup(slug: string, user: any) {
    const group = await this.groupModel.findOne({ slug });
    if (!group) throw new NotFoundException('Circle not found.');

    const userId = new Types.ObjectId(user.id);

    // Block check
    const isBlocked = group.blockedMembers.some((id) => id.toString() === user.id);
    if (isBlocked) throw new ForbiddenException('You have been blocked from this group.');

    const alreadyMember = group.members.some((id) => id.toString() === user.id);
    if (alreadyMember) return { ...group.toObject(), status: 'member' };

    const alreadyPending = group.pendingMembers.some((id) => id.toString() === user.id);
    if (alreadyPending) return { ...group.toObject(), status: 'pending' };

    if (group.privacy === 'private') {
      group.pendingMembers.push(userId);
      await group.save();
      return { ...group.toObject(), status: 'pending' };
    }

    group.members.push(userId);
    group.membersCount = group.membersCount + 1;
    await group.save();
    await this.userModel.findByIdAndUpdate(user.id, { $addToSet: { groups: group._id } });
    await this.activityModel.create({
      actorId: userId,
      actorName: user.name,
      actorHandle: user.handle,
      type: 'join',
      text: `joined ${group.name}`,
      targetName: group.name,
      targetSlug: group.slug,
      groupSlug: '',
    });

    return { ...group.toObject(), status: 'member' };
  }

  async leaveGroup(slug: string, user: any) {
    const group = await this.groupModel.findOne({ slug });
    if (!group) throw new NotFoundException('Circle not found.');

    group.members = group.members.filter((id) => id.toString() !== user.id) as Types.ObjectId[];
    group.pendingMembers = group.pendingMembers.filter((id) => id.toString() !== user.id) as Types.ObjectId[];
    group.membersCount = Math.max(0, group.members.length);
    await group.save();
    await this.userModel.findByIdAndUpdate(user.id, { $pull: { groups: group._id } });
    return { ok: true };
  }

  async listGroupMembers(slug: string, userId?: string) {
    const group = await this.groupModel.findOne({ slug }).lean();
    if (!group) throw new NotFoundException('Circle not found.');

    // Private groups: only members can see the member list
    if (group.privacy === 'private' && userId) {
      const isMember = group.members.some((id) => id.toString() === userId);
      if (!isMember) throw new ForbiddenException('This group is private.');
    }

    const users = await this.userModel
      .find({ _id: { $in: group.members } })
      .select('name handle avatar bio status')
      .lean();

    return users;
  }

  async listPendingMembers(slug: string) {
    const group = await this.groupModel.findOne({ slug }).lean();
    if (!group) throw new NotFoundException('Circle not found.');

    const users = await this.userModel
      .find({ _id: { $in: group.pendingMembers } })
      .select('name handle avatar bio status')
      .lean();

    return users;
  }

  async approveMember(slug: string, targetUserId: string) {
    const group = await this.groupModel.findOne({ slug });
    if (!group) throw new NotFoundException('Circle not found.');

    const tid = new Types.ObjectId(targetUserId);
    const isPending = group.pendingMembers.some((id) => id.toString() === targetUserId);
    if (!isPending) throw new NotFoundException('User is not in pending list.');

    group.pendingMembers = group.pendingMembers.filter((id) => id.toString() !== targetUserId) as Types.ObjectId[];
    group.members.push(tid);
    group.membersCount = group.members.length;
    await group.save();
    await this.userModel.findByIdAndUpdate(targetUserId, { $addToSet: { groups: group._id } });
    return { ok: true };
  }

  async removeMember(slug: string, targetUserId: string) {
    const group = await this.groupModel.findOne({ slug });
    if (!group) throw new NotFoundException('Circle not found.');

    group.members = group.members.filter((id) => id.toString() !== targetUserId) as Types.ObjectId[];
    group.pendingMembers = group.pendingMembers.filter((id) => id.toString() !== targetUserId) as Types.ObjectId[];
    group.membersCount = group.members.length;
    await group.save();
    await this.userModel.findByIdAndUpdate(targetUserId, { $pull: { groups: group._id } });
    return { ok: true };
  }

  async blockMember(slug: string, targetUserId: string) {
    const group = await this.groupModel.findOne({ slug });
    if (!group) throw new NotFoundException('Circle not found.');

    const tid = new Types.ObjectId(targetUserId);
    group.members = group.members.filter((id) => id.toString() !== targetUserId) as Types.ObjectId[];
    group.pendingMembers = group.pendingMembers.filter((id) => id.toString() !== targetUserId) as Types.ObjectId[];
    group.membersCount = group.members.length;

    const alreadyBlocked = group.blockedMembers.some((id) => id.toString() === targetUserId);
    if (!alreadyBlocked) group.blockedMembers.push(tid);

    await group.save();
    await this.userModel.findByIdAndUpdate(targetUserId, { $pull: { groups: group._id } });
    return { ok: true };
  }

  async unblockMember(slug: string, targetUserId: string) {
    const group = await this.groupModel.findOne({ slug });
    if (!group) throw new NotFoundException('Circle not found.');

    group.blockedMembers = group.blockedMembers.filter((id) => id.toString() !== targetUserId) as Types.ObjectId[];
    await group.save();
    return { ok: true };
  }

  // ─── Activity ─────────────────────────────────────────────────────────────────

  async listActivity() {
    // Only return non-group-scoped activity in the global feed
    const items = await this.activityModel
      .find({ $or: [{ groupSlug: '' }, { groupSlug: { $exists: false } }] })
      .sort({ createdAt: -1 })
      .limit(80)
      .lean();

    return items.map((item) => ({
      ...item,
      likes: Math.max(item.likes ?? 0, 0),
      comments: Math.max(item.comments ?? 0, 0),
    }));
  }

  async listActivityByHandle(handle: string) {
    const items = await this.activityModel
      .find({ actorHandle: handle })
      .sort({ createdAt: -1 })
      .limit(80)
      .lean();

    return items.map((item) => ({
      ...item,
      likes: Math.max(item.likes ?? 0, 0),
      comments: Math.max(item.comments ?? 0, 0),
    }));
  }

  async listMyActivity(userId: string) {
    const items = await this.activityModel
      .find({ actorId: userId })
      .sort({ createdAt: -1 })
      .limit(80)
      .lean();

    return items.map((item) => ({
      ...item,
      likes: Math.max(item.likes ?? 0, 0),
      comments: Math.max(item.comments ?? 0, 0),
    }));
  }

  async listGroupActivity(slug: string, userId?: string) {
    const group = await this.groupModel.findOne({ slug }).lean();
    if (!group) throw new NotFoundException('Circle not found.');

    // Private group: only members can see posts
    if (group.privacy === 'private') {
      const isMember = userId ? group.members.some((id) => id.toString() === userId) : false;
      if (!isMember) throw new ForbiddenException('This group is private. Join to see posts.');
    }

    const items = await this.activityModel
      .find({ groupSlug: slug })
      .sort({ createdAt: -1 })
      .limit(80)
      .lean();

    return items.map((item) => ({
      ...item,
      likes: Math.max(item.likes ?? 0, 0),
      comments: Math.max(item.comments ?? 0, 0),
    }));
  }

  async createActivity(dto: ActivityDto, user: any) {
    const activity = await this.activityModel.create({
      ...dto,
      actorId: user.id,
      actorName: user.name,
      actorHandle: user.handle,
      type: dto.type ?? 'post',
      groupSlug: dto.groupSlug ?? '',
      likes: 0,
      comments: 0,
      likedBy: [],
      commentsList: [],
    });

    if (dto.media?.length) {
      await this.postMediaModel.insertMany(
        dto.media.map((item: any) => ({
          activityId: activity._id,
          type: item.type ?? 'image',
          url: item.url,
          caption: item.caption ?? '',
        })),
      );
    }

    return activity;
  }

  async updateActivity(activityId: string, dto: ActivityUpdateDto, user: any) {
    const activity = await this.activityModel.findById(activityId);
    if (!activity) throw new NotFoundException('Activity not found.');

    const isAdmin = user.role === 'admin';
    if (!isAdmin && activity.actorId?.toString() !== user.id) {
      throw new NotFoundException('You can only edit your own activity.');
    }

    const updated = await this.activityModel
      .findByIdAndUpdate(
        activityId,
        {
          $set: {
            ...(dto.text ? { text: dto.text } : {}),
            ...(dto.type ? { type: dto.type } : {}),
            ...(dto.targetName !== undefined ? { targetName: dto.targetName } : {}),
            ...(dto.targetSlug !== undefined ? { targetSlug: dto.targetSlug } : {}),
            ...(dto.media !== undefined ? { media: dto.media } : {}),
          },
        },
        { new: true },
      )
      .lean();

    return updated;
  }

  async deleteActivity(activityId: string, user: any) {
    const activity = await this.activityModel.findById(activityId);
    if (!activity) throw new NotFoundException('Activity not found.');

    const isAdmin = user.role === 'admin';
    if (!isAdmin && activity.actorId?.toString() !== user.id) {
      throw new NotFoundException('You can only delete your own activity.');
    }

    await this.activityModel.findByIdAndDelete(activityId);
    return { ok: true, deletedId: activityId };
  }

  async likeActivity(activityId: string, user: any) {
    const activity = await this.activityModel.findById(activityId);
    if (!activity) throw new NotFoundException('Activity not found.');

    const userId = user.id.toString();
    const liked = (activity.likedBy ?? []).some((item) => item.toString() === userId);
    const currentLikes = Math.max(activity.likes ?? 0, 0);
    const nextLikes = liked ? Math.max(currentLikes - 1, 0) : currentLikes + 1;

    const update = liked
      ? { $pull: { likedBy: userId }, $set: { likes: nextLikes } }
      : { $addToSet: { likedBy: userId }, $set: { likes: nextLikes } };

    const updated = await this.activityModel.findByIdAndUpdate(activityId, update, { new: true }).lean();
    const actor = await this.userModel.findById(activity.actorId).lean();
    if (actor && actor._id.toString() !== user.id) {
      await this.notificationModel.create({
        recipientId: activity.actorId,
        actorId: user.id,
        type: 'like' as const,
        message: `${user.name} liked your activity`,
        link: `/activity`,
      });
      this.chatGateway.emitToUser(activity.actorId.toString(), 'notification', {
        type: 'like',
        message: `${user.name} liked your activity`,
        link: `/activity`,
        actorName: user.name,
      });
    }

    return updated;
  }

  async reactToActivity(activityId: string, reaction: string, user: any) {
    const activity = await this.activityModel.findById(activityId);
    if (!activity) throw new NotFoundException('Activity not found.');

    const reactionTypes = ['like', 'love', 'celebrate', 'laugh', 'sad', 'angry'];
    const safeReaction = reactionTypes.includes(reaction) ? reaction : 'like';
    const userId = user.id.toString();
    const reactedBy =
      activity.reactedBy instanceof Map
        ? activity.reactedBy
        : new Map(Object.entries((activity.reactedBy ?? {}) as Record<string, string>));
    const previousReaction = reactedBy.get(userId);
    const nextReactions = {
      like: Math.max(activity.reactions?.like ?? 0, 0),
      love: Math.max(activity.reactions?.love ?? 0, 0),
      celebrate: Math.max(activity.reactions?.celebrate ?? 0, 0),
      laugh: Math.max(activity.reactions?.laugh ?? 0, 0),
      sad: Math.max(activity.reactions?.sad ?? 0, 0),
      angry: Math.max(activity.reactions?.angry ?? 0, 0),
    };

    if (previousReaction === safeReaction) {
      nextReactions[safeReaction] = Math.max(nextReactions[safeReaction] - 1, 0);
      reactedBy.delete(userId);
    } else {
      if (previousReaction && reactionTypes.includes(previousReaction)) {
        nextReactions[previousReaction] = Math.max(nextReactions[previousReaction] - 1, 0);
      }
      nextReactions[safeReaction] = nextReactions[safeReaction] + 1;
      reactedBy.set(userId, safeReaction);
    }

    activity.reactions = nextReactions;
    activity.reactedBy = reactedBy;
    activity.markModified('reactions');
    activity.markModified('reactedBy');
    await activity.save();
    const updated = activity.toObject();

    if (activity.actorId && activity.actorId.toString() !== user.id) {
      await this.notificationModel.create({
        recipientId: activity.actorId,
        actorId: user.id,
        type: 'reaction' as const,
        message: `${user.name} reacted to your activity`,
        link: '/activity',
      });
      this.chatGateway.emitToUser(activity.actorId.toString(), 'notification', {
        type: 'reaction',
        message: `${user.name} reacted to your activity`,
        link: '/activity',
        actorName: user.name,
      });
    }

    return updated;
  }

  async commentOnActivity(activityId: string, dto: ActivityCommentDto, user: any) {
    const activity = await this.activityModel.findById(activityId);
    if (!activity) throw new NotFoundException('Activity not found.');

    const comment = {
      authorId: new Types.ObjectId(user.id),
      authorName: user.name,
      authorHandle: user.handle ?? '',
      body: dto.body,
      likes: 0,
      likedBy: [],
      replies: [],
      createdAt: new Date(),
    };

    const updated = await this.activityModel
      .findByIdAndUpdate(
        activityId,
        { $push: { commentsList: comment }, $inc: { comments: 1 } },
        { new: true },
      )
      .lean();

    if (activity.actorId && activity.actorId.toString() !== user.id) {
      await this.notificationModel.create({
        recipientId: activity.actorId,
        actorId: user.id,
        type: 'comment' as const,
        message: `${user.name} commented on your activity`,
        link: `/activity`,
      });
      this.chatGateway.emitToUser(activity.actorId.toString(), 'notification', {
        type: 'comment',
        message: `${user.name} commented on your activity`,
        link: `/activity`,
        actorName: user.name,
      });
    }

    return updated;
  }

  async likeActivityComment(activityId: string, commentIndex: number, user: any) {
    if (!Number.isInteger(commentIndex) || commentIndex < 0) throw new NotFoundException('Comment not found.');

    const activity = await this.activityModel.findById(activityId);
    if (!activity) throw new NotFoundException('Activity not found.');

    const comment = activity.commentsList?.[commentIndex];
    if (!comment) throw new NotFoundException('Comment not found.');

    const userId = user.id.toString();
    const likedBy = comment.likedBy ?? [];
    const liked = likedBy.some((id) => id.toString() === userId);
    const currentLikes = Math.max(comment.likes ?? 0, 0);

    comment.likedBy = liked ? likedBy.filter((id) => id.toString() !== userId) : [...likedBy, userId];
    comment.likes = liked ? Math.max(currentLikes - 1, 0) : currentLikes + 1;

    activity.markModified('commentsList');
    await activity.save();
    return activity.toObject();
  }

  async replyToActivityComment(activityId: string, commentIndex: number, dto: ActivityCommentDto, user: any) {
    if (!Number.isInteger(commentIndex) || commentIndex < 0) throw new NotFoundException('Comment not found.');

    const activity = await this.activityModel.findById(activityId);
    if (!activity) throw new NotFoundException('Activity not found.');

    const comment = activity.commentsList?.[commentIndex];
    if (!comment) throw new NotFoundException('Comment not found.');

    comment.replies = [
      ...(comment.replies ?? []),
      {
        authorId: new Types.ObjectId(user.id),
        authorName: user.name,
        authorHandle: user.handle ?? '',
        body: dto.body,
        createdAt: new Date(),
      },
    ];

    activity.markModified('commentsList');
    await activity.save();
    return activity.toObject();
  }

  async saveFavorite(activityId: string, user: any) {
    const exists = await this.favoriteModel.findOne({ userId: user.id, activityId });
    if (exists) {
      await this.favoriteModel.deleteOne({ userId: user.id, activityId });
      return { saved: false };
    }

    await this.favoriteModel.create({ userId: user.id, activityId });
    return { saved: true };
  }

  async listFavorites(user: any) {
    const items = await this.favoriteModel.find({ userId: user.id }).lean();
    const activityIds = items.map((item) => item.activityId);
    const results = await this.activityModel.find({ _id: { $in: activityIds } }).sort({ createdAt: -1 }).lean();

    return results.map((item) => ({
      ...item,
      likes: Math.max(item.likes ?? 0, 0),
      comments: Math.max(item.comments ?? 0, 0),
    }));
  }

  async sendFriendRequest(targetUserId: string, user: any) {
    const uid = new Types.ObjectId(user.id);
    const tid = new Types.ObjectId(targetUserId);
    const existing = await this.friendshipModel.findOne({
      $or: [
        { requesterId: uid, addresseeId: tid },
        { requesterId: tid, addresseeId: uid },
      ],
    });

    if (existing) return existing;

    const friendship = await this.friendshipModel.create({ requesterId: uid, addresseeId: tid, status: 'pending' });
    await this.notificationModel.create({
      recipientId: targetUserId,
      actorId: user.id,
      type: 'friend' as const,
      message: `${user.name} sent you a friend request`,
      link: '/members',
    });
    this.chatGateway.emitToUser(targetUserId, 'notification', {
      type: 'friend',
      message: `${user.name} sent you a friend request`,
      link: '/members',
      actorName: user.name,
    });

    return friendship;
  }

  async topMembersByFriends(limit = 3) {
    const rows = await this.friendshipModel.aggregate([
      { $match: { status: 'accepted' } },
      {
        $project: {
          users: ['$requesterId', '$addresseeId'],
        },
      },
      { $unwind: '$users' },
      { $group: { _id: '$users', friendCount: { $sum: 1 } } },
      { $sort: { friendCount: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: '$user._id',
          name: '$user.name',
          handle: '$user.handle',
          avatar: '$user.avatar',
          bio: '$user.bio',
          friendCount: 1,
        },
      },
    ]);
    return rows;
  }

  async listFriends(user: any) {
    const uid = new Types.ObjectId(user.id);
    const friendships = await this.friendshipModel.find({
      $or: [
        { requesterId: uid, status: 'accepted' },
        { addresseeId: uid, status: 'accepted' },
      ],
    }).lean();

    if (!friendships.length) return [];

    const friendIds = friendships.map((f) =>
      f.requesterId.toString() === user.id ? f.addresseeId : f.requesterId,
    );

    const users = await this.userModel.find({ _id: { $in: friendIds } }).lean();
    return users.map((u: any) => ({
      _id: u._id,
      name: u.name,
      handle: u.handle,
      avatar: u.avatar,
      status: u.status,
      bio: u.bio,
    }));
  }

  async listFriendRequests(user: any) {
    const uid = new Types.ObjectId(user.id);
    const requests = await this.friendshipModel.find({ addresseeId: uid, status: 'pending' }).lean();

    const requesterIds = requests.map((r) => r.requesterId);
    const users = await this.userModel.find({ _id: { $in: requesterIds } }).lean();

    return requests.map((r) => {
      const requester = users.find((u: any) => u._id.toString() === r.requesterId.toString());
      return {
        friendshipId: r._id,
        requesterId: r.requesterId,
        name: requester?.name ?? '',
        handle: requester?.handle ?? '',
        avatar: requester?.avatar ?? '',
        status: requester?.status ?? '',
        bio: requester?.bio ?? '',
      };
    });
  }

  async cancelFriendRequest(targetUserId: string, user: any) {
    const uid = new Types.ObjectId(user.id);
    const tid = new Types.ObjectId(targetUserId);
    await this.friendshipModel.deleteOne({ requesterId: uid, addresseeId: tid, status: 'pending' });
    return { ok: true };
  }

  async listOutgoingRequests(user: any) {
    const uid = new Types.ObjectId(user.id);
    const requests = await this.friendshipModel.find({ requesterId: uid, status: 'pending' }).lean();
    return requests.map((r) => ({
      userId: r.addresseeId.toString(),
      friendshipId: r._id.toString(),
    }));
  }

  async acceptFriendRequest(friendshipId: string, user: any) {
    const friendship = await this.friendshipModel.findById(friendshipId);
    if (!friendship) throw new NotFoundException('Friend request not found.');
    if (friendship.status !== 'pending') throw new NotFoundException('Friend request already processed.');
    if (friendship.addresseeId.toString() !== user.id.toString()) {
      throw new ForbiddenException('You are not authorized to accept this request.');
    }

    friendship.status = 'accepted';
    await friendship.save();

    try {
      await this.notificationModel.create({
        recipientId: friendship.requesterId,
        actorId: new Types.ObjectId(user.id),
        type: 'friend' as const,
        message: `${user.name} accepted your friend request`,
        link: `/members/${user.handle ?? ''}`,
      });
      this.chatGateway.emitToUser(friendship.requesterId.toString(), 'notification', {
        type: 'friend',
        message: `${user.name} accepted your friend request`,
        link: `/members/${user.handle ?? ''}`,
        actorName: user.name,
      });
    } catch { /* notification failure must not roll back the accept */ }

    return { status: 'accepted', _id: friendship._id };
  }

  async rejectFriendRequest(friendshipId: string, user: any) {
    const friendship = await this.friendshipModel.findById(friendshipId);
    if (!friendship) throw new NotFoundException('Friend request not found.');
    if (friendship.status !== 'pending') throw new NotFoundException('Friend request already processed.');
    if (friendship.addresseeId.toString() !== user.id.toString()) {
      throw new ForbiddenException('You are not authorized to reject this request.');
    }
    friendship.status = 'rejected';
    await friendship.save();
    return { status: 'rejected', _id: friendship._id };
  }

  async removeFriend(targetUserId: string, user: any) {
    await this.friendshipModel.deleteOne({
      $or: [
        { requesterId: user.id, addresseeId: targetUserId, status: 'accepted' },
        { requesterId: targetUserId, addresseeId: user.id, status: 'accepted' },
      ],
    });
    return { ok: true };
  }

  async listNotifications(user: any) {
    return this.notificationModel
      .find({ recipientId: new Types.ObjectId(user.id) })
      .sort({ createdAt: -1 })
      .limit(40)
      .lean();
  }

  async getUnreadNotificationCount(userId: string) {
    const count = await this.notificationModel.countDocuments({
      recipientId: new Types.ObjectId(userId),
      read: false,
      type: { $ne: 'message' },
    });
    return { count };
  }

  async markAllNotificationsRead(userId: string) {
    await this.notificationModel.updateMany(
      { recipientId: new Types.ObjectId(userId), read: false },
      { read: true },
    );
    return { ok: true };
  }

  async listThreads(category?: string) {
    const query = category ? { category: new RegExp(category, 'i') } : {};
    return this.threadModel.find(query).sort({ pinned: -1, lastActivityAt: -1 }).limit(80).lean();
  }

  async createThread(dto: ForumThreadDto, user: any) {
    return this.threadModel.create({
      ...dto,
      slug: slugify(dto.title),
      authorId: user.id,
      authorName: user.name,
      lastActivityAt: new Date(),
    });
  }

  async listFiles(type?: string) {
    const query: any = type ? { type } : {};
    return this.fileModel.find(query).sort({ createdAt: -1 }).limit(80).lean();
  }

  async createFile(dto: FileAssetDto, user: any) {
    return this.fileModel.create({ ...dto, ownerId: user.id, ownerName: user.name });
  }

  async listMessages(user: any) {
    return this.messageModel
      .find({ participants: new Types.ObjectId(user.id) })
      .sort({ lastMessageAt: -1 })
      .limit(40)
      .lean();
  }

  async createOrGetThread(currentUser: any, otherUserId: string) {
    const curId = new Types.ObjectId(currentUser.id);
    const othId = new Types.ObjectId(otherUserId);
    const friendship = await this.friendshipModel.findOne({
      $or: [
        { requesterId: curId, addresseeId: othId, status: 'accepted' },
        { requesterId: othId, addresseeId: curId, status: 'accepted' },
      ],
    });
    if (!friendship) throw new ForbiddenException('You must be friends to message this user.');

    const existing = await this.messageModel.findOne({
      $and: [
        { participants: curId },
        { participants: othId },
        { participants: { $size: 2 } },
      ],
    }).lean();
    if (existing) return existing;

    const otherUser = await this.userModel.findById(otherUserId).lean();
    const title = `${currentUser.name} and ${otherUser?.name ?? 'Member'}`;

    return this.messageModel.create({
      title,
      participants: [curId, othId],
      messages: [],
      lastMessageAt: new Date(),
      lastReadAt: {},
    });
  }

  async getThread(threadId: string, userId: string) {
    const thread = await this.messageModel.findOne({
      _id: threadId,
      participants: new Types.ObjectId(userId),
    }).lean();
    if (!thread) throw new NotFoundException('Thread not found.');
    return thread;
  }

  async markThreadRead(threadId: string, userId: string) {
    await this.messageModel.findByIdAndUpdate(threadId, {
      $set: { [`lastReadAt.${userId}`]: Date.now() },
    });
    return { ok: true };
  }

  async getUnreadMessageCount(userId: string) {
    const threads = await this.messageModel
      .find({ participants: new Types.ObjectId(userId) })
      .lean();

    let count = 0;
    for (const t of threads) {
      const lastRead = (t.lastReadAt as any)?.[userId] ?? 0;
      const unread = (t.messages as any[]).filter(
        (m) => m.senderId?.toString() !== userId && new Date(m.createdAt ?? 0).getTime() > lastRead,
      ).length;
      count += unread;
    }
    return { count };
  }

  async sendMessage(threadId: string, dto: MessageDto, user: any) {
    const userDoc = await this.userModel.findById(user.id).lean();
    const message = {
      senderId: new Types.ObjectId(user.id),
      senderName: user.name ?? 'Member',
      senderAvatar: userDoc?.avatar ?? '',
      body: dto.body ?? '',
      mediaUrl: dto.mediaUrl ?? '',
      mediaType: dto.mediaType ?? '',
      createdAt: new Date(),
    };

    const thread = await this.messageModel
      .findByIdAndUpdate(
        threadId,
        {
          $push: { messages: message },
          $set: { lastMessageAt: new Date() },
        },
        { new: true },
      )
      .lean();

    if (!thread) throw new NotFoundException('Message thread not found.');

    const otherParticipantId = (thread.participants as Types.ObjectId[]).find(
      (p) => p.toString() !== user.id,
    );

    if (otherParticipantId) {
      await this.notificationModel.create({
        recipientId: otherParticipantId,
        actorId: new Types.ObjectId(user.id),
        type: 'message' as const,
        message: `${user.name} sent you a message`,
        link: `/messages`,
      });
      this.chatGateway.emitToUser(otherParticipantId.toString(), 'notification', {
        type: 'message',
        message: `${user.name} sent you a message`,
        link: `/messages`,
        actorName: user.name,
        threadId: threadId,
      });
    }

    return { thread, message };
  }

  async deleteMessage(threadId: string, messageId: string, userId: string) {
    const thread = await this.messageModel.findOne({
      _id: threadId,
      participants: new Types.ObjectId(userId),
    });
    if (!thread) throw new NotFoundException('Thread not found.');
    const msg = (thread.messages as any[]).find((m) => m._id?.toString() === messageId);
    if (!msg) throw new NotFoundException('Message not found.');
    if (msg.senderId?.toString() !== userId) {
      throw new ForbiddenException('Cannot delete someone else\'s message.');
    }
    await this.messageModel.updateOne(
      { _id: threadId },
      { $pull: { messages: { _id: new Types.ObjectId(messageId) } } },
    );
    // Broadcast deletion to all participants so the other user sees it instantly
    const participantIds = (thread.participants as Types.ObjectId[]).map((p) => p.toString());
    this.chatGateway.emitToParticipants(participantIds, 'message-deleted', { threadId, messageId });
    return { ok: true };
  }

  async deleteThread(threadId: string, userId: string) {
    const thread = await this.messageModel.findOne({
      _id: threadId,
      participants: new Types.ObjectId(userId),
    });
    if (!thread) throw new NotFoundException('Thread not found.');
    await this.messageModel.deleteOne({ _id: threadId });
    return { ok: true };
  }
}
