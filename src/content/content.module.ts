import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Article, ArticleSchema } from './article.schema';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Article.name, schema: ArticleSchema }])],
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService, MongooseModule],
})
export class ContentModule {}
