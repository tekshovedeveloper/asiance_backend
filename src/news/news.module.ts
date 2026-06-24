import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NewsCategory, NewsCategorySchema } from './news-category.schema';
import { NewsController } from './news.controller';
import { NewsItem, NewsItemSchema } from './news-item.schema';
import { NewsService } from './news.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NewsItem.name, schema: NewsItemSchema },
      { name: NewsCategory.name, schema: NewsCategorySchema },
    ]),
  ],
  controllers: [NewsController],
  providers: [NewsService],
  exports: [NewsService, MongooseModule],
})
export class NewsModule {}
