import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Article, ArticleDocument } from '../content/article.schema';
import { NewsItem, NewsItemDocument } from '../news/news-item.schema';
import { Group, GroupDocument } from '../community/group.schema';
import { Product, ProductDocument } from '../shop/product.schema';
import { User, UserDocument } from '../users/user.schema';

type SearchResultItem = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  href: string;
};

type SearchSection = {
  key: 'articles' | 'members' | 'news' | 'groups' | 'products';
  label: string;
  items: SearchResultItem[];
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function rankResults<T>(items: T[], query: string, titleFor: (item: T) => string, limit: number) {
  const normalizedQuery = query.toLocaleLowerCase();

  return [...items]
    .sort((left, right) => {
      const leftTitle = titleFor(left).toLocaleLowerCase();
      const rightTitle = titleFor(right).toLocaleLowerCase();
      const score = (title: string) => {
        if (title === normalizedQuery) return 0;
        if (title.startsWith(normalizedQuery)) return 1;
        if (title.includes(normalizedQuery)) return 2;
        return 3;
      };

      return score(leftTitle) - score(rightTitle);
    })
    .slice(0, limit);
}

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(Article.name) private readonly articleModel: Model<ArticleDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(NewsItem.name) private readonly newsModel: Model<NewsItemDocument>,
    @InjectModel(Group.name) private readonly groupModel: Model<GroupDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
  ) {}

  async search(rawQuery?: string, rawLimit?: string) {
    const query = cleanText(rawQuery).slice(0, 80);
    const parsedLimit = Number.parseInt(rawLimit ?? '', 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(8, Math.max(1, parsedLimit)) : 5;

    if (query.length < 2) return this.response(query, []);

    const regex = new RegExp(escapeRegex(query), 'i');
    const candidateLimit = Math.min(limit * 3, 24);

    const [articleCandidates, memberCandidates, newsCandidates, groupCandidates, productCandidates] = await Promise.all([
      this.articleModel
        .find({
          status: 'published',
          $or: [{ title: regex }, { excerpt: regex }, { category: regex }, { tags: regex }],
        })
        .select('_id title slug category excerpt image publishedAt')
        .sort({ featured: -1, publishedAt: -1 })
        .limit(candidateLimit)
        .lean(),
      this.userModel
        .find({
          isBlocked: { $ne: true },
          profileVisibility: 'public',
          $or: [{ name: regex }, { handle: regex }, { bio: regex }, { location: regex }],
        })
        .select('_id name handle avatar bio location')
        .sort({ name: 1 })
        .limit(candidateLimit)
        .lean(),
      this.newsModel
        .find({
          status: 'published',
          $or: [{ title: regex }, { excerpt: regex }, { categoryName: regex }, { tags: regex }],
        })
        .select('_id title slug categoryName excerpt image publishedAt')
        .sort({ featured: -1, publishedAt: -1 })
        .limit(candidateLimit)
        .lean(),
      this.groupModel
        .find({
          privacy: 'public',
          $or: [{ name: regex }, { description: regex }, { category: regex }, { tags: regex }],
        })
        .select('_id name slug category description image profilePicture coverPhoto members membersCount')
        .sort({ membersCount: -1, createdAt: -1 })
        .limit(candidateLimit)
        .lean(),
      this.productModel
        .find({
          status: 'active',
          $or: [{ name: regex }, { description: regex }, { shortDescription: regex }, { category: regex }, { tags: regex }, { brands: regex }, { sku: regex }],
        })
        .select('_id name slug category shortDescription description image price salePrice')
        .sort({ featured: -1, menuOrder: 1, createdAt: -1 })
        .limit(candidateLimit)
        .lean(),
    ]);

    const articles = rankResults(articleCandidates, query, (item) => item.title, limit).map((item) => ({
      id: String(item._id),
      title: item.title,
      subtitle: item.category,
      description: cleanText(item.excerpt),
      image: cleanText(item.image),
      href: `/blog/${item.slug}`,
    }));

    const members = rankResults(memberCandidates, query, (item) => item.name, limit).map((item) => ({
      id: String(item._id),
      title: item.name,
      subtitle: `@${item.handle}${item.location ? ` · ${item.location}` : ''}`,
      description: cleanText(item.bio),
      image: cleanText(item.avatar),
      href: `/members/${item.handle}`,
    }));

    const news = rankResults(newsCandidates, query, (item) => item.title, limit).map((item) => ({
      id: String(item._id),
      title: item.title,
      subtitle: item.categoryName,
      description: cleanText(item.excerpt),
      image: cleanText(item.image),
      href: `/community-news/${item.slug}`,
    }));

    const groups = rankResults(groupCandidates, query, (item) => item.name, limit).map((item) => ({
      id: String(item._id),
      title: item.name,
      subtitle: `${item.category || 'Community'} · ${item.members?.length ?? item.membersCount ?? 0} members`,
      description: cleanText(item.description),
      image: cleanText(item.profilePicture || item.image || item.coverPhoto),
      href: `/circles/${item.slug}`,
    }));

    const products = rankResults(productCandidates, query, (item) => item.name, limit).map((item) => ({
      id: String(item._id),
      title: item.name,
      subtitle: `${item.category} · $${(item.salePrice ?? item.price).toFixed(2)}`,
      description: cleanText(item.shortDescription || item.description),
      image: cleanText(item.image),
      href: `/shop/${item.slug}`,
    }));

    return this.response(query, [
      { key: 'articles', label: 'Articles', items: articles },
      { key: 'members', label: 'Members', items: members },
      { key: 'news', label: 'Community news', items: news },
      { key: 'groups', label: 'Groups', items: groups },
      { key: 'products', label: 'Products', items: products },
    ]);
  }

  private response(query: string, sections: SearchSection[]) {
    const completeSections: SearchSection[] = sections.length ? sections : [
      { key: 'articles', label: 'Articles', items: [] },
      { key: 'members', label: 'Members', items: [] },
      { key: 'news', label: 'Community news', items: [] },
      { key: 'groups', label: 'Groups', items: [] },
      { key: 'products', label: 'Products', items: [] },
    ];

    return {
      query,
      total: completeSections.reduce((total, section) => total + section.items.length, 0),
      sections: completeSections,
    };
  }
}
