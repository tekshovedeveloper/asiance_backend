import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { MessageThread, MessageThreadDocument } from './message-thread.schema';
import { Notification, NotificationDocument } from './notification.schema';
import { User, UserDocument } from '../users/user.schema';

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    @InjectModel(MessageThread.name) private readonly messageModel: Model<MessageThreadDocument>,
    @InjectModel(Notification.name) private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    const token =
      (client.handshake.auth as any)?.token ||
      (client.handshake.headers?.authorization as string)?.split(' ')[1];

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify(token) as { sub: string; name?: string };
      const user = await this.userModel.findById(payload.sub).lean();
      client.data.userId = payload.sub;
      client.data.userName = user?.name ?? payload.name ?? 'Member';
      client.data.userAvatar = user?.avatar ?? '';
      client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(_client: Socket) {
    // room membership is cleaned up automatically by socket.io
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { threadId: string; body?: string; mediaUrl?: string; mediaType?: string; clientId?: string },
  ) {
    const userId = client.data.userId as string | undefined;
    if (!userId) return;

    // Use client-provided ID (pre-generated ObjectId hex) so _id is known before DB round-trip
    const messageId = data.clientId && Types.ObjectId.isValid(data.clientId)
      ? new Types.ObjectId(data.clientId)
      : new Types.ObjectId();

    const message = {
      _id: messageId,
      senderId: new Types.ObjectId(userId),
      senderName: client.data.userName as string,
      senderAvatar: client.data.userAvatar as string,
      body: data.body ?? '',
      mediaUrl: data.mediaUrl ?? '',
      mediaType: data.mediaType ?? '',
      createdAt: new Date(),
    };

    const thread = await this.messageModel
      .findByIdAndUpdate(
        data.threadId,
        {
          $push: { messages: message },
          $set: { lastMessageAt: new Date() },
        },
        { new: true },
      )
      .lean();

    if (!thread) return;

    const enriched = {
      _id: messageId.toString(),
      clientId: data.clientId,
      threadId: data.threadId,
      senderId: userId,
      senderName: message.senderName,
      senderAvatar: message.senderAvatar,
      body: message.body,
      mediaUrl: message.mediaUrl,
      mediaType: message.mediaType,
      createdAt: message.createdAt.toISOString(),
    };

    // Emit only to OTHER participants — sender already has the optimistic update
    (thread.participants as Types.ObjectId[]).filter((p) => p.toString() !== userId).forEach((participantId) => {
      this.server.to(`user:${participantId.toString()}`).emit('new-message', enriched);
    });

    const otherId = (thread.participants as Types.ObjectId[]).find(
      (p) => p.toString() !== userId,
    );

    if (otherId) {
      await this.notificationModel.create({
        recipientId: otherId,
        actorId: new Types.ObjectId(userId),
        type: 'message',
        message: `${client.data.userName} sent you a message`,
        link: `/messages`,
      });

      this.server.to(`user:${otherId.toString()}`).emit('notification', {
        type: 'message',
        message: `${client.data.userName} sent you a message`,
        threadId: data.threadId,
      });
    }

    // Send saved message (with real _id) directly back to sender to replace optimistic
    client.emit('message-saved', enriched);
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { threadId: string; isTyping: boolean },
  ) {
    const userId = client.data.userId as string | undefined;
    if (!userId) return;

    client.broadcast.emit('typing', {
      userId,
      threadId: data.threadId,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('mark-read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { threadId: string },
  ) {
    const userId = client.data.userId as string | undefined;
    if (!userId) return;

    await this.messageModel.findByIdAndUpdate(data.threadId, {
      $set: { [`lastReadAt.${userId}`]: Date.now() },
    });
  }

  emitToUser(userId: string, event: string, data: unknown) {
    if (this.server) {
      this.server.to(`user:${userId}`).emit(event, data);
    }
  }

  emitToParticipants(participantIds: string[], event: string, data: unknown) {
    if (!this.server) return;
    for (const id of participantIds) {
      this.server.to(`user:${id}`).emit(event, data);
    }
  }
}
