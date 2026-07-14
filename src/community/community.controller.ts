import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CloudinaryService } from '../uploads/cloudinary.service';
import { uploadFileFilter } from '../uploads/upload-file.filter';
import { MAX_UPLOAD_FILE_SIZE_BYTES } from '../uploads/upload-limits';
import { UploadSizeExceptionFilter } from '../uploads/upload-size.exception-filter';
import { CommunityService } from './community.service';
import { ActivityCommentDto, ActivityDto, ActivityUpdateDto, CreateThreadDto, FileAssetDto, ForumThreadDto, GroupDto, GroupTypeDto, MessageDto, ReactionDto } from './dto';

@Controller()
export class CommunityController {
  constructor(
    private readonly community: CommunityService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  // ─── Group Types ────────────────────────────────────────────────────────────

  @Get('group-types')
  listGroupTypes() {
    return this.community.listGroupTypes();
  }

  @Post('group-types')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  createGroupType(@Body() dto: GroupTypeDto) {
    return this.community.createGroupType(dto);
  }

  @Patch('group-types/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  updateGroupType(@Param('id') id: string, @Body() dto: Partial<GroupTypeDto>) {
    return this.community.updateGroupType(id, dto);
  }

  @Delete('group-types/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  deleteGroupType(@Param('id') id: string) {
    return this.community.deleteGroupType(id);
  }

  // ─── Groups ─────────────────────────────────────────────────────────────────

  @Get('groups')
  groups(@Query('q') q?: string, @Query('category') category?: string) {
    return this.community.listGroups({ q, category });
  }

  @Get('groups/mine')
  @UseGuards(AuthGuard('jwt'))
  myGroups(@CurrentUser() user: any) {
    return this.community.listMyGroups(user.id);
  }

  @Get('groups/:slug')
  group(@Param('slug') slug: string) {
    return this.community.findGroup(slug);
  }

  @Post('groups')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  createGroup(@Body() dto: GroupDto) {
    return this.community.createGroup(dto);
  }

  @Patch('groups/:slug')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  updateGroup(@Param('slug') slug: string, @Body() dto: Partial<GroupDto>) {
    return this.community.updateGroup(slug, dto);
  }

  @Delete('groups/:slug')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  deleteGroup(@Param('slug') slug: string) {
    return this.community.deleteGroup(slug);
  }

  @Post('groups/:slug/join')
  @UseGuards(AuthGuard('jwt'))
  join(@Param('slug') slug: string, @CurrentUser() user: any) {
    return this.community.joinGroup(slug, user);
  }

  @Post('groups/:slug/leave')
  @UseGuards(AuthGuard('jwt'))
  leave(@Param('slug') slug: string, @CurrentUser() user: any) {
    return this.community.leaveGroup(slug, user);
  }

  @Get('groups/:slug/members')
  @UseGuards(AuthGuard('jwt'))
  groupMembers(@Param('slug') slug: string, @CurrentUser() user: any) {
    return this.community.listGroupMembers(slug, user?.id);
  }

  @Get('groups/:slug/pending')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  pendingMembers(@Param('slug') slug: string) {
    return this.community.listPendingMembers(slug);
  }

  @Post('groups/:slug/approve/:userId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  approveMember(@Param('slug') slug: string, @Param('userId') userId: string) {
    return this.community.approveMember(slug, userId);
  }

  @Post('groups/:slug/remove/:userId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  removeMember(@Param('slug') slug: string, @Param('userId') userId: string) {
    return this.community.removeMember(slug, userId);
  }

  @Post('groups/:slug/block/:userId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  blockMember(@Param('slug') slug: string, @Param('userId') userId: string) {
    return this.community.blockMember(slug, userId);
  }

  @Post('groups/:slug/unblock/:userId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  unblockMember(@Param('slug') slug: string, @Param('userId') userId: string) {
    return this.community.unblockMember(slug, userId);
  }

  @Get('groups/:slug/activity')
  groupActivity(@Param('slug') slug: string, @Req() req: any) {
    // Optional auth — extract user id from JWT if present
    const userId = req.user?.id as string | undefined;
    return this.community.listGroupActivity(slug, userId);
  }

  // ─── Activity ────────────────────────────────────────────────────────────────

  @Get('activity')
  activity() {
    return this.community.listActivity();
  }

  @Get('activity/mine')
  @UseGuards(AuthGuard('jwt'))
  myActivity(@CurrentUser() user: any) {
    return this.community.listMyActivity(user.id);
  }

  @Get('activity/by-handle/:handle')
  memberActivity(@Param('handle') handle: string) {
    return this.community.listActivityByHandle(handle);
  }

  @Post('activity')
  @UseGuards(AuthGuard('jwt'))
  createActivity(@Body() dto: ActivityDto, @CurrentUser() user: any) {
    return this.community.createActivity(dto, user);
  }

  @Patch('activity/:activityId')
  @UseGuards(AuthGuard('jwt'))
  updateActivity(@Param('activityId') activityId: string, @Body() dto: ActivityUpdateDto, @CurrentUser() user: any) {
    return this.community.updateActivity(activityId, dto, user);
  }

  @Post('activity/:activityId/like')
  @UseGuards(AuthGuard('jwt'))
  likeActivity(@Param('activityId') activityId: string, @CurrentUser() user: any) {
    return this.community.likeActivity(activityId, user);
  }

  @Post('activity/:activityId/react')
  @UseGuards(AuthGuard('jwt'))
  reactToActivity(@Param('activityId') activityId: string, @Body() dto: ReactionDto, @CurrentUser() user: any) {
    return this.community.reactToActivity(activityId, dto.reaction, user);
  }

  @Post('activity/:activityId/comments')
  @UseGuards(AuthGuard('jwt'))
  commentOnActivity(@Param('activityId') activityId: string, @Body() dto: ActivityCommentDto, @CurrentUser() user: any) {
    return this.community.commentOnActivity(activityId, dto, user);
  }

  @Post('activity/:activityId/comments/:commentIndex/like')
  @UseGuards(AuthGuard('jwt'))
  likeActivityComment(@Param('activityId') activityId: string, @Param('commentIndex') commentIndex: string, @CurrentUser() user: any) {
    return this.community.likeActivityComment(activityId, Number(commentIndex), user);
  }

  @Post('activity/:activityId/comments/:commentIndex/replies')
  @UseGuards(AuthGuard('jwt'))
  replyToActivityComment(
    @Param('activityId') activityId: string,
    @Param('commentIndex') commentIndex: string,
    @Body() dto: ActivityCommentDto,
    @CurrentUser() user: any,
  ) {
    return this.community.replyToActivityComment(activityId, Number(commentIndex), dto, user);
  }

  @Post('activity/:activityId/delete')
  @UseGuards(AuthGuard('jwt'))
  deleteActivity(@Param('activityId') activityId: string, @CurrentUser() user: any) {
    return this.community.deleteActivity(activityId, user);
  }

  // ─── Favorites ───────────────────────────────────────────────────────────────

  @Get('favorites')
  @UseGuards(AuthGuard('jwt'))
  favorites(@CurrentUser() user: any) {
    return this.community.listFavorites(user);
  }

  @Post('favorites/:activityId')
  @UseGuards(AuthGuard('jwt'))
  favorite(@Param('activityId') activityId: string, @CurrentUser() user: any) {
    return this.community.saveFavorite(activityId, user);
  }

  // ─── Notifications ───────────────────────────────────────────────────────────

  @Get('notifications/unread-count')
  @UseGuards(AuthGuard('jwt'))
  notificationsUnreadCount(@CurrentUser() user: any) {
    return this.community.getUnreadNotificationCount(user.id);
  }

  @Patch('notifications/read-all')
  @UseGuards(AuthGuard('jwt'))
  markAllNotificationsRead(@CurrentUser() user: any) {
    return this.community.markAllNotificationsRead(user.id);
  }

  @Get('notifications')
  @UseGuards(AuthGuard('jwt'))
  notifications(@CurrentUser() user: any) {
    return this.community.listNotifications(user);
  }

  // ─── Friends ─────────────────────────────────────────────────────────────────

  @Get('members/top')
  topMembers() {
    return this.community.topMembersByFriends(3);
  }

  @Get('friends')
  @UseGuards(AuthGuard('jwt'))
  listFriends(@CurrentUser() user: any) {
    return this.community.listFriends(user);
  }

  @Get('friends/requests')
  @UseGuards(AuthGuard('jwt'))
  listFriendRequests(@CurrentUser() user: any) {
    return this.community.listFriendRequests(user);
  }

  @Get('friends/outgoing')
  @UseGuards(AuthGuard('jwt'))
  listOutgoingRequests(@CurrentUser() user: any) {
    return this.community.listOutgoingRequests(user);
  }

  @Post('friends/:userId/request')
  @UseGuards(AuthGuard('jwt'))
  sendFriendRequest(@Param('userId') userId: string, @CurrentUser() user: any) {
    return this.community.sendFriendRequest(userId, user);
  }

  @Post('friends/:userId/cancel')
  @UseGuards(AuthGuard('jwt'))
  cancelFriendRequest(@Param('userId') userId: string, @CurrentUser() user: any) {
    return this.community.cancelFriendRequest(userId, user);
  }

  @Post('friends/:friendshipId/accept')
  @UseGuards(AuthGuard('jwt'))
  acceptFriendRequest(@Param('friendshipId') friendshipId: string, @CurrentUser() user: any) {
    return this.community.acceptFriendRequest(friendshipId, user);
  }

  @Post('friends/:friendshipId/reject')
  @UseGuards(AuthGuard('jwt'))
  rejectFriendRequest(@Param('friendshipId') friendshipId: string, @CurrentUser() user: any) {
    return this.community.rejectFriendRequest(friendshipId, user);
  }

  @Post('friends/:userId/remove')
  @UseGuards(AuthGuard('jwt'))
  removeFriend(@Param('userId') userId: string, @CurrentUser() user: any) {
    return this.community.removeFriend(userId, user);
  }

  // ─── Forums ──────────────────────────────────────────────────────────────────

  @Get('forums/threads')
  threads(@Query('category') category?: string) {
    return this.community.listThreads(category);
  }

  @Post('forums/threads')
  @UseGuards(AuthGuard('jwt'))
  createThread(@Body() dto: ForumThreadDto, @CurrentUser() user: any) {
    return this.community.createThread(dto, user);
  }

  // ─── Library ─────────────────────────────────────────────────────────────────

  @Get('library')
  files(@Query('type') type?: string) {
    return this.community.listFiles(type);
  }

  @Post('library')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  createFile(@Body() dto: FileAssetDto, @CurrentUser() user: any) {
    return this.community.createFile(dto, user);
  }

  @Post('library/upload')
  @UseGuards(AuthGuard('jwt'))
  @UseFilters(UploadSizeExceptionFilter)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    fileFilter: uploadFileFilter,
    limits: { fileSize: MAX_UPLOAD_FILE_SIZE_BYTES },
  }))
  async uploadLibraryFile(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('No file uploaded.');

    const uploaded = await this.cloudinary.uploadBuffer({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      folder: 'asiance/library',
    });

    return {
      url: uploaded.secureUrl,
      publicId: uploaded.publicId,
      resourceType: uploaded.resourceType,
    };
  }

  // ─── Messages ────────────────────────────────────────────────────────────────

  @Get('messages')
  @UseGuards(AuthGuard('jwt'))
  messages(@CurrentUser() user: any) {
    return this.community.listMessages(user);
  }

  @Get('messages/unread')
  @UseGuards(AuthGuard('jwt'))
  unreadCount(@CurrentUser() user: any) {
    return this.community.getUnreadMessageCount(user.id);
  }

  @Post('messages/thread/:userId')
  @UseGuards(AuthGuard('jwt'))
  createOrGetThread(@Param('userId') userId: string, @CurrentUser() user: any) {
    return this.community.createOrGetThread(user, userId);
  }

  @Get('messages/:threadId')
  @UseGuards(AuthGuard('jwt'))
  getThread(@Param('threadId') threadId: string, @CurrentUser() user: any) {
    return this.community.getThread(threadId, user.id);
  }

  @Patch('messages/:threadId/read')
  @UseGuards(AuthGuard('jwt'))
  markRead(@Param('threadId') threadId: string, @CurrentUser() user: any) {
    return this.community.markThreadRead(threadId, user.id);
  }

  @Post('messages/:threadId')
  @UseGuards(AuthGuard('jwt'))
  send(@Param('threadId') threadId: string, @Body() dto: MessageDto, @CurrentUser() user: any) {
    return this.community.sendMessage(threadId, dto, user);
  }

  @Delete('messages/:threadId/message/:messageId')
  @UseGuards(AuthGuard('jwt'))
  deleteMessage(
    @Param('threadId') threadId: string,
    @Param('messageId') messageId: string,
    @CurrentUser() user: any,
  ) {
    return this.community.deleteMessage(threadId, messageId, user.id);
  }

  @Delete('messages/:threadId')
  @UseGuards(AuthGuard('jwt'))
  deleteThread(@Param('threadId') threadId: string, @CurrentUser() user: any) {
    return this.community.deleteThread(threadId, user.id);
  }
}
