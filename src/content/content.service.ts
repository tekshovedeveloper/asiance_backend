import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { slugify } from '../common/slug';
import { Article, ArticleDocument } from './article.schema';
import { ArticleDto } from './dto';

@Injectable()
export class ContentService {
  constructor(@InjectModel(Article.name) private readonly articleModel: Model<ArticleDocument>) {}

  async list(options: { category?: string; q?: string } = {}) {
    const query: any = {};
    if (options.category) query.category = new RegExp(options.category, 'i');
    if (options.q) {
      query.$or = [
        { title: new RegExp(options.q, 'i') },
        { excerpt: new RegExp(options.q, 'i') },
        { content: new RegExp(options.q, 'i') },
      ];
    }

    return this.articleModel.find(query).sort({ publishedAt: -1 }).limit(100).lean();
  }

  async findBySlug(slug: string) {
    const article = await this.articleModel.findOne({ slug }).lean();
    if (!article) {
      throw new NotFoundException('Article not found.');
    }
    return article;
  }

  async create(dto: ArticleDto) {
    return this.articleModel.create({
      ...dto,
      slug: dto.slug || slugify(dto.title),
      publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : new Date(),
    });
  }

  async update(slug: string, dto: Partial<ArticleDto>) {
    const update = {
      ...dto,
      ...(dto.title && !dto.slug ? { slug: slugify(dto.title) } : {}),
      ...(dto.publishedAt ? { publishedAt: new Date(dto.publishedAt) } : {}),
    };
    const article = await this.articleModel.findOneAndUpdate({ slug }, update, { new: true }).lean();
    if (!article) {
      throw new NotFoundException('Article not found.');
    }
    return article;
  }

  async remove(slug: string) {
    const result = await this.articleModel.findOneAndDelete({ slug }).lean();
    if (!result) {
      throw new NotFoundException('Article not found.');
    }
    return { deleted: true };
  }
}
