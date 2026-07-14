import { Module, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/user.schema';
import { UploadsModule } from '../uploads/uploads.module';
import { Activity, ActivitySchema } from './activity.schema';
import { ChatGateway } from './chat.gateway';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { Favorite, FavoriteSchema } from './favorite.schema';
import { FileAsset, FileAssetSchema } from './file-asset.schema';
import { Friendship, FriendshipSchema } from './friendship.schema';
import { ForumThread, ForumThreadSchema } from './forum-thread.schema';
import { Group, GroupSchema } from './group.schema';
import { GroupType, GroupTypeSchema } from './group-type.schema';
import { MessageThread, MessageThreadSchema } from './message-thread.schema';
import { Notification, NotificationSchema } from './notification.schema';
import { PostMedia, PostMediaSchema } from './post-media.schema';

@Module({
  imports: [
    UploadsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? 'dev-secret-change-me',
      }),
    }),
    MongooseModule.forFeature([
      { name: Group.name, schema: GroupSchema },
      { name: GroupType.name, schema: GroupTypeSchema },
      { name: Activity.name, schema: ActivitySchema },
      { name: ForumThread.name, schema: ForumThreadSchema },
      { name: FileAsset.name, schema: FileAssetSchema },
      { name: MessageThread.name, schema: MessageThreadSchema },
      { name: User.name, schema: UserSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: Favorite.name, schema: FavoriteSchema },
      { name: Friendship.name, schema: FriendshipSchema },
      { name: PostMedia.name, schema: PostMediaSchema },
    ]),
  ],
  controllers: [CommunityController],
  providers: [CommunityService, ChatGateway],
  exports: [CommunityService, MongooseModule],
})
export class CommunityModule {}
