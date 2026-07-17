import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { CommunityModule } from './community/community.module';
import { ContentModule } from './content/content.module';
import { NewsModule } from './news/news.module';
import { ShopModule } from './shop/shop.module';
import { UsersModule } from './users/users.module';
import { ShippingModule } from './shipping/shipping.module';
import { UploadsModule } from './uploads/uploads.module';
import { ContactModule } from './contact/contact.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI') ?? 'mongodb://127.0.0.1:27017/asiance',
      }),
    }),
    UsersModule,
    AuthModule,
    ContentModule,
    NewsModule,
    ShopModule,
    CommunityModule,
    AdminModule,
    ShippingModule,
    UploadsModule,
    ContactModule,
  ],
})
export class AppModule {}
