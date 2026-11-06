import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { slugify } from '../common/slug';
import { ArticleCategory, ArticleCategoryDocument } from './article-category.schema';
import { Article, ArticleDocument } from './article.schema';
import { ArticleCarousel, ArticleCarouselDocument } from './article-carousel.schema';
import { DEFAULT_ARTICLE_CATEGORIES } from './defaults';
import { ArticleCarouselDto, ArticleCategoryDto, ArticleDto } from './dto';

const ARTICLE_CAROUSEL_SECTIONS = new Set([
  'home',
  'beauty',
  'tech',
  'fashion',
  'lifestyle',
  'baby',
  'kids',
  'wedding',
  'dating',
  'travel',
]);

@Injectable()
export class ContentService {
  constructor(
    @InjectModel(Article.name) private readonly articleModel: Model<ArticleDocument>,
    @InjectModel(ArticleCategory.name) private readonly categoryModel: Model<ArticleCategoryDocument>,
    @InjectModel(ArticleCarousel.name) private readonly carouselModel: Model<ArticleCarouselDocument>,
  ) {}

  async getCarousel(sectionValue: string) {
    const section = this.normalizeCarouselSection(sectionValue);
    const carousel = await this.carouselModel.findOne({ section }).lean();

    if (!carousel) {
      return {
        section,
        articleIds: [],
        articles: [],
        autoRotate: true,
        rotationIntervalMs: 6000,
      };
    }

    const articleIds = (carousel.articleIds ?? []).map((id) => String(id));
    const articles = await this.articleModel
      .find({
        _id: { $in: carousel.articleIds ?? [] },
        $and: [
          { $or: [{ status: { $exists: false } }, { status: 'published' }] },
          { $or: [{ publishedAt: { $exists: false } }, { publishedAt: { $lte: new Date() } }] },
        ],
      })
      .lean();
    const articlesById = new Map(articles.map((article) => [String(article._id), article]));
    const publishedArticleIds = articleIds.filter((id) => articlesById.has(id));

    return {
      section,
      articleIds: publishedArticleIds,
      articles: publishedArticleIds.map((id) => articlesById.get(id)),
      autoRotate: carousel.autoRotate !== false,
      rotationIntervalMs: carousel.rotationIntervalMs ?? 6000,
    };
  }

  async updateCarousel(sectionValue: string, dto: ArticleCarouselDto) {
    const section = this.normalizeCarouselSection(sectionValue);
    const articleIds = dto.articleIds.map((id) => new Types.ObjectId(id));
    const availableArticles = await this.articleModel
      .find({
        _id: { $in: articleIds },
        $and: [
          { $or: [{ status: { $exists: false } }, { status: 'published' }] },
          { $or: [{ publishedAt: { $exists: false } }, { publishedAt: { $lte: new Date() } }] },
        ],
      })
      .select('_id')
      .lean();

    if (availableArticles.length !== articleIds.length) {
      throw new BadRequestException('Only currently published articles can be added to a carousel.');
    }

    await this.carouselModel.findOneAndUpdate(
      { section },
      {
        $set: {
          articleIds,
          autoRotate: dto.autoRotate ?? true,
          rotationIntervalMs: dto.rotationIntervalMs ?? 6000,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return this.getCarousel(section);
  }

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

    const article = await this.articleModel.create({
      ...dto,
      slug,
      publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : new Date(),
      status: dto.status ?? 'published',
      approvedAt: (dto.status ?? 'published') === 'published' ? new Date() : null,
    });

    if (article.featured && article.status === 'published') {
      await this.clearOtherFeaturedArticles(article.category, article._id);
    }

    return article;
  }

  async submit(dto: ArticleDto, user: { id: string; name: string; handle?: string }) {
    const slug = await this.uniqueSlug(dto.slug || dto.title);
    const status = dto.status === 'draft' ? 'draft' : 'pending';

    return this.articleModel.create({
      ...dto,
      slug,
      authorId: Types.ObjectId.isValid(user.id) ? new Types.ObjectId(user.id) : user.id,
      authorName: user.name || dto.authorName || 'Member',
      authorHandle: user.handle || '',
      featured: Boolean(dto.featured),
      status,
      submittedAt: status === 'pending' ? new Date() : null,
      approvedAt: null,
      publishedAt: new Date(),
    });
  }

  async updateMine(slug: string, dto: Partial<ArticleDto>, userId: string) {
    const authorId = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : userId;
    const existing = await this.articleModel.findOne({ slug, authorId });
    if (!existing) {
      throw new NotFoundException('Article not found.');
    }

    const keepAsDraft = existing.status === 'draft' && dto.status === 'draft';
    const nextStatus: 'draft' | 'pending' = keepAsDraft ? 'draft' : 'pending';
    const update: Partial<Article> & { slug?: string } = {
      status: nextStatus,
      submittedAt: nextStatus === 'pending' ? new Date() : undefined,
      approvedAt: undefined,
    };

    if (dto.title !== undefined) update.title = dto.title;
    if (dto.category !== undefined) update.category = dto.category;
    if (dto.excerpt !== undefined) update.excerpt = dto.excerpt;
    if (dto.content !== undefined) update.content = dto.content;
    if (dto.image !== undefined) update.image = dto.image;
    if (dto.tags !== undefined) update.tags = dto.tags;
    if (dto.featured !== undefined) update.featured = dto.featured;

    if (dto.slug || dto.title) {
      update.slug = await this.uniqueSlug(dto.slug || dto.title || existing.title, existing._id);
    }

    const article = await this.articleModel.findByIdAndUpdate(
      existing._id,
      {
        $set: {
          ...update,
          approvedAt: null,
          submittedAt: nextStatus === 'pending' ? new Date() : null,
        },
      },
      { new: true },
    ).lean();

    if (!article) {
      throw new NotFoundException('Article not found.');
    }

    return article;
  }

  async removeMine(slug: string, userId: string) {
    const authorId = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : userId;
    const result = await this.articleModel.findOneAndDelete({ slug, authorId }).lean();
    if (!result) {
      throw new NotFoundException('Article not found.');
    }
    await this.carouselModel.updateMany({}, { $pull: { articleIds: result._id } });
    return { deleted: true };
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

    if (article.featured && article.status === 'published') {
      await this.clearOtherFeaturedArticles(article.category, article._id);
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

    if (article.featured) {
      await this.clearOtherFeaturedArticles(article.category, article._id);
    }

    return article;
  }

  async remove(slug: string) {
    const result = await this.articleModel.findOneAndDelete({ slug }).lean();
    if (!result) {
      throw new NotFoundException('Article not found.');
    }
    await this.carouselModel.updateMany({}, { $pull: { articleIds: result._id } });
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

  private async clearOtherFeaturedArticles(category: string, selectedId: Types.ObjectId) {
    await this.articleModel.updateMany(
      {
        _id: { $ne: selectedId },
        category,
        featured: true,
        $or: [{ status: 'published' }, { status: { $exists: false } }],
      },
      { $set: { featured: false } },
    );
  }

  private normalizeCarouselSection(value: string) {
    const section = slugify(value);
    if (!ARTICLE_CAROUSEL_SECTIONS.has(section)) {
      throw new BadRequestException('Unsupported article carousel section.');
    }
    return section;
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
