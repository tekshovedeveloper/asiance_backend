import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { slugify } from '../common/slug';
import { ArticleCategory, ArticleCategoryDocument } from './article-category.schema';
import { Article, ArticleDocument } from './article.schema';
import { DEFAULT_ARTICLE_CATEGORIES } from './defaults';
import { ArticleCategoryDto, ArticleDto } from './dto';

@Injectable()
export class ContentService {
  constructor(
    @InjectModel(Article.name) private readonly articleModel: Model<ArticleDocument>,
    @InjectModel(ArticleCategory.name) private readonly categoryModel: Model<ArticleCategoryDocument>,
  ) {}

  async list(options: { category?: string; q?: string; includeDrafts?: boolean; status?: string } = {}) {
    const query: any = {};
    if (options.category) query.category = new RegExp(options.category, 'i');
    if (options.status) query.status = options.status;
    if (options.q) {
      query.$or = [
        { title: new RegExp(options.q, 'i') },
        { excerpt: new RegExp(options.q, 'i') },
        { content: new RegExp(options.q, 'i') },
      ];
    }
    if (!options.includeDrafts) {
      query.$and = [
        {
          $or: [{ status: { $exists: false } }, { status: 'published' }],
        },
        {
          $or: [{ publishedAt: { $exists: false } }, { publishedAt: { $lte: new Date() } }],
        },
      ];
    }

    return this.articleModel.find(query).sort({ publishedAt: -1 }).limit(100).lean();
  }

  async listMine(userId: string, status?: string) {
    const query: any = {
      authorId: Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : userId,
    };

    if (status) query.status = status;

    return this.articleModel.find(query).sort({ updatedAt: -1, submittedAt: -1 }).limit(100).lean();
  }

  async listCategories() {
    await this.ensureDefaultCategories();
    return this.categoryModel.find().sort({ sortOrder: 1, name: 1 }).lean();
  }

  async createCategory(dto: ArticleCategoryDto) {
    const slug = slugify(dto.slug || dto.name);
    return this.categoryModel.create({
      ...dto,
      slug,
      sortOrder: dto.sortOrder ?? 0,
    });
  }

  async updateCategory(slug: string, dto: Partial<ArticleCategoryDto>) {
    const existing = await this.categoryModel.findOne({ slug }).lean();
    if (!existing) {
      throw new NotFoundException('Article category not found.');
    }

    const nextSlug = dto.slug ? slugify(dto.slug) : existing.slug;
    const nextName = dto.name ?? existing.name;
    const category = await this.categoryModel
      .findOneAndUpdate(
        { slug },
        {
          ...dto,
          slug: nextSlug,
          name: nextName,
        },
        { new: true },
      )
      .lean();

    await this.articleModel.updateMany({ category: existing.name }, { category: nextName });
    return category;
  }

  async removeCategory(slug: string) {
    const category = await this.categoryModel.findOne({ slug }).lean();
    if (!category) {
      throw new NotFoundException('Article category not found.');
    }

    const used = await this.articleModel.countDocuments({ category: category.name });
    if (used > 0) {
      throw new BadRequestException('Move or delete articles before deleting this category.');
    }

    await this.categoryModel.deleteOne({ slug });
    return { deleted: true };
  }

  async findBySlug(slug: string) {
    const article = await this.articleModel
      .findOne({
        slug,
        $and: [
          { $or: [{ status: { $exists: false } }, { status: 'published' }] },
          { $or: [{ publishedAt: { $exists: false } }, { publishedAt: { $lte: new Date() } }] },
        ],
      })
      .lean();
    if (!article) {
      throw new NotFoundException('Article not found.');
    }
    return article;
  }

  async create(dto: ArticleDto) {
    const slug = await this.uniqueSlug(dto.slug || dto.title);

    return this.articleModel.create({
      ...dto,
      slug,
      publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : new Date(),
      status: dto.status ?? 'published',
      approvedAt: (dto.status ?? 'published') === 'published' ? new Date() : null,
    });
  }

  async submit(dto: ArticleDto, user: { id: string; name: string; handle?: string }) {
    const slug = await this.uniqueSlug(dto.slug || dto.title);

    return this.articleModel.create({
      ...dto,
      slug,
      authorId: Types.ObjectId.isValid(user.id) ? new Types.ObjectId(user.id) : user.id,
      authorName: user.name || dto.authorName || 'Member',
      authorHandle: user.handle || '',
      featured: Boolean(dto.featured),
      status: 'pending',
      submittedAt: new Date(),
      approvedAt: null,
      publishedAt: new Date(),
    });
  }

  async update(slug: string, dto: Partial<ArticleDto>) {
    const existing = await this.articleModel.findOne({ slug });
    if (!existing) {
      throw new NotFoundException('Article not found.');
    }

    const { slug: requestedSlug, publishedAt, ...rest } = dto;
    const update: any = {
      ...rest,
      ...(publishedAt ? { publishedAt: new Date(publishedAt) } : {}),
    };

    if (rest.status === 'published' && existing.status !== 'published') {
      update.publishedAt = publishedAt ? new Date(publishedAt) : new Date();
      update.approvedAt = new Date();
    }

    if (rest.status === 'pending') {
      update.approvedAt = null;
    }

    if (requestedSlug || dto.title) {
      update.slug = await this.uniqueSlug(requestedSlug || dto.title, existing._id);
    }

    const article = await this.articleModel.findByIdAndUpdate(existing._id, update, { new: true }).lean();
    if (!article) {
      throw new NotFoundException('Article not found.');
    }
    return article;
  }

  async approve(slug: string) {
    const article = await this.articleModel
      .findOneAndUpdate(
        { slug },
        {
          status: 'published',
          publishedAt: new Date(),
          approvedAt: new Date(),
        },
        { new: true },
      )
      .lean();

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

  private async uniqueSlug(value: string, excludeId?: unknown) {
    const base = slugify(value || 'article') || 'article';
    let slug = base;
    let suffix = 2;

    const slugExists = async (candidate: string) => {
      const query: any = { slug: candidate };
      if (excludeId) query._id = { $ne: excludeId };
      return this.articleModel.exists(query);
    };

    while (await slugExists(slug)) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }

    return slug;
  }

  private async ensureDefaultCategories() {
    const articleCategories = await this.articleModel.distinct('category');
    const categoriesBySlug = new Map(
      [
        ...DEFAULT_ARTICLE_CATEGORIES,
        ...articleCategories
          .filter(Boolean)
          .map((name) => ({ name, slug: slugify(name) })),
      ].map((category) => [category.slug, category]),
    );
    const categories = Array.from(categoriesBySlug.values());

    await Promise.all(
      categories.map((category, index) =>
        this.categoryModel.updateOne(
          { slug: category.slug },
          { $setOnInsert: { ...category, sortOrder: index } },
          { upsert: true },
        ),
      ),
    );
  }
}
