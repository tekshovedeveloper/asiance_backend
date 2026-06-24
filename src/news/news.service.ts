import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { slugify } from '../common/slug';
import { DEFAULT_NEWS_CATEGORIES } from './defaults';
import { NewsCategoryDto, NewsItemDto } from './dto';
import { NewsCategory, NewsCategoryDocument } from './news-category.schema';
import { NewsItem, NewsItemDocument } from './news-item.schema';

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toBoolean(value?: string | boolean) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return undefined;
}

function limitValue(value?: string | number) {
  const parsed = Number(value ?? 100);
  if (!Number.isFinite(parsed)) return 100;
  return Math.min(Math.max(parsed, 1), 100);
}

@Injectable()
export class NewsService {
  constructor(
    @InjectModel(NewsItem.name) private readonly newsModel: Model<NewsItemDocument>,
    @InjectModel(NewsCategory.name) private readonly categoryModel: Model<NewsCategoryDocument>,
  ) {}

  async ensureDefaultCategories() {
    await Promise.all(
      DEFAULT_NEWS_CATEGORIES.map((category, index) =>
        this.categoryModel.updateOne(
          { slug: category.slug },
          { $setOnInsert: { ...category, sortOrder: index } },
          { upsert: true },
        ),
      ),
    );
  }

  async listCategories() {
    await this.ensureDefaultCategories();
    return this.categoryModel.find().sort({ sortOrder: 1, name: 1 }).lean();
  }

  async createCategory(dto: NewsCategoryDto) {
    const slug = slugify(dto.slug || dto.name);
    return this.categoryModel.create({
      ...dto,
      slug,
      sortOrder: dto.sortOrder ?? 0,
    });
  }

  async updateCategory(slug: string, dto: Partial<NewsCategoryDto>) {
    const existing = await this.categoryModel.findOne({ slug }).lean();
    if (!existing) {
      throw new NotFoundException('News category not found.');
    }

    const nextSlug = dto.slug ? slugify(dto.slug) : existing.slug;
    const nextName = dto.name ?? existing.name;
    const update = {
      ...dto,
      slug: nextSlug,
      name: nextName,
    };

    const category = await this.categoryModel
      .findOneAndUpdate({ slug }, update, { new: true })
      .lean();

    await this.newsModel.updateMany(
      { categorySlug: existing.slug },
      { categorySlug: nextSlug, categoryName: nextName },
    );

    return category;
  }

  async removeCategory(slug: string) {
    const used = await this.newsModel.countDocuments({ categorySlug: slug });
    if (used > 0) {
      throw new BadRequestException('Move or delete news items before deleting this category.');
    }

    const category = await this.categoryModel.findOneAndDelete({ slug }).lean();
    if (!category) {
      throw new NotFoundException('News category not found.');
    }

    return { deleted: true };
  }

  async listItems(
    options: {
      category?: string;
      q?: string;
      featured?: string | boolean;
      breaking?: string | boolean;
      limit?: string | number;
      includeDrafts?: boolean;
    } = {},
  ) {
    const query: any = {};
    if (!options.includeDrafts) query.status = 'published';
    if (options.category) query.categorySlug = slugify(options.category);

    const featured = toBoolean(options.featured);
    if (featured !== undefined) query.featured = featured;

    const breaking = toBoolean(options.breaking);
    if (breaking !== undefined) query.breaking = breaking;

    if (options.q) {
      const regex = new RegExp(escapeRegex(options.q), 'i');
      query.$or = [
        { title: regex },
        { excerpt: regex },
        { content: regex },
        { categoryName: regex },
        { sourceName: regex },
      ];
    }

    return this.newsModel.find(query).sort({ publishedAt: -1 }).limit(limitValue(options.limit)).lean();
  }

  async findBySlug(slug: string) {
    const item = await this.newsModel.findOne({ slug, status: 'published' }).lean();
    if (!item) {
      throw new NotFoundException('News item not found.');
    }
    return item;
  }

  async createItem(dto: NewsItemDto) {
    const category = await this.resolveCategory(dto);
    return this.newsModel.create({
      ...dto,
      categoryName: category.name,
      categorySlug: category.slug,
      slug: slugify(dto.slug || dto.title),
      publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : new Date(),
      status: dto.status ?? 'published',
    });
  }

  async updateItem(slug: string, dto: Partial<NewsItemDto>) {
    const category = dto.categorySlug || dto.categoryName ? await this.resolveCategory(dto) : undefined;
    const update = {
      ...dto,
      ...(category ? { categoryName: category.name, categorySlug: category.slug } : {}),
      ...(dto.slug ? { slug: slugify(dto.slug) } : {}),
      ...(dto.title && !dto.slug ? { slug: slugify(dto.title) } : {}),
      ...(dto.publishedAt ? { publishedAt: new Date(dto.publishedAt) } : {}),
    };

    const item = await this.newsModel.findOneAndUpdate({ slug }, update, { new: true }).lean();
    if (!item) {
      throw new NotFoundException('News item not found.');
    }
    return item;
  }

  async removeItem(slug: string) {
    const item = await this.newsModel.findOneAndDelete({ slug }).lean();
    if (!item) {
      throw new NotFoundException('News item not found.');
    }
    return { deleted: true };
  }

  private async resolveCategory(dto: Partial<NewsItemDto>) {
    await this.ensureDefaultCategories();
    const rawSlug = dto.categorySlug || dto.categoryName || '';
    const categorySlug = slugify(rawSlug);
    if (!categorySlug) {
      throw new BadRequestException('News category is required.');
    }

    let category = await this.categoryModel.findOne({ slug: categorySlug }).lean();
    if (!category && dto.categoryName) {
      category = (await this.createCategory({
        name: dto.categoryName,
        slug: categorySlug,
      })) as any;
    }

    if (!category) {
      throw new BadRequestException('News category was not found.');
    }

    return { name: category.name, slug: category.slug };
  }
}
