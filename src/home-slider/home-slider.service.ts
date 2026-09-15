import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Article, ArticleDocument } from '../content/article.schema';
import { HomeSlideDto } from './dto';
import { HomeSlide, HomeSlideDocument } from './home-slide.schema';

@Injectable()
export class HomeSliderService {
  constructor(
    @InjectModel(HomeSlide.name) private readonly slideModel: Model<HomeSlideDocument>,
    @InjectModel(Article.name) private readonly articleModel: Model<ArticleDocument>,
  ) {}

  private publishedArticles() {
    return {
      $and: [
        { $or: [{ status: { $exists: false } }, { status: 'published' as const }] },
        { $or: [{ publishedAt: { $exists: false } }, { publishedAt: { $lte: new Date() } }] },
      ],
    };
  }

  async list(includeInactive = false) {
    const slides = await this.slideModel.find(includeInactive ? {} : { active: true })
      .sort({ sortOrder: 1, createdAt: 1, _id: 1 })
      .populate({
        path: 'articleId',
        select: 'title slug excerpt category status publishedAt',
        ...(includeInactive ? {} : { match: this.publishedArticles() }),
      })
      .lean();

    return slides.filter((slide) => includeInactive || slide.articleId).map(({ articleId, ...slide }) => ({
      ...slide,
      articleId: articleId?._id ?? null,
      article: articleId,
    }));
  }

  selectableArticles() {
    return this.articleModel.find(this.publishedArticles())
      .select('title slug excerpt category image').sort({ title: 1 }).lean();
  }

  private async checkArticle(articleId: string) {
    const article = await this.articleModel.exists({ _id: articleId, ...this.publishedArticles() });
    if (!article) throw new BadRequestException('Choose a published blog that is available on the website.');
  }

  async create(dto: HomeSlideDto) {
    await this.checkArticle(dto.articleId);
    return this.slideModel.create(dto);
  }

  async update(id: string, dto: HomeSlideDto) {
    this.checkId(id);
    await this.checkArticle(dto.articleId);
    const slide = await this.slideModel.findByIdAndUpdate(id, { $set: dto }, { new: true, runValidators: true }).lean();
    if (!slide) throw new NotFoundException('Slide not found.');
    return slide;
  }

  async remove(id: string) {
    this.checkId(id);
    const slide = await this.slideModel.findByIdAndDelete(id).lean();
    if (!slide) throw new NotFoundException('Slide not found.');
    return { deleted: true };
  }

  private checkId(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid slide ID.');
  }
}
