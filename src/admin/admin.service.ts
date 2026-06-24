import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Activity, ActivityDocument } from '../community/activity.schema';
import { Group, GroupDocument } from '../community/group.schema';
import { Article, ArticleDocument } from '../content/article.schema';
import { NewsCategory, NewsCategoryDocument } from '../news/news-category.schema';
import { NewsItem, NewsItemDocument } from '../news/news-item.schema';
import { Order, OrderDocument } from '../shop/order.schema';
import { Product, ProductDocument } from '../shop/product.schema';
import { User, UserDocument } from '../users/user.schema';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    @InjectModel(Article.name) private readonly articles: Model<ArticleDocument>,
    @InjectModel(NewsItem.name) private readonly news: Model<NewsItemDocument>,
    @InjectModel(NewsCategory.name) private readonly newsCategories: Model<NewsCategoryDocument>,
    @InjectModel(Product.name) private readonly products: Model<ProductDocument>,
    @InjectModel(Order.name) private readonly orders: Model<OrderDocument>,
    @InjectModel(Group.name) private readonly groups: Model<GroupDocument>,
    @InjectModel(Activity.name) private readonly activity: Model<ActivityDocument>,
  ) {}

  async stats() {
    const [members, articles, news, newsCategories, products, orders, groups, activities, revenue] =
      await Promise.all([
        this.users.countDocuments(),
        this.articles.countDocuments(),
        this.news.countDocuments(),
        this.newsCategories.countDocuments(),
        this.products.countDocuments({ status: { $ne: 'archived' } }),
        this.orders.countDocuments(),
        this.groups.countDocuments(),
        this.activity.countDocuments(),
        this.orders.aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }]),
      ]);

    return {
      members,
      articles,
      news,
      newsCategories,
      products,
      orders,
      groups,
      activities,
      revenue: revenue[0]?.total ?? 0,
    };
  }

  async overview() {
    const [latestMembers, latestOrders, latestActivity] = await Promise.all([
      this.users.find().sort({ createdAt: -1 }).limit(8).select('-passwordHash').lean(),
      this.orders.find().sort({ createdAt: -1 }).limit(8).lean(),
      this.activity.find().sort({ createdAt: -1 }).limit(8).lean(),
    ]);

    return { latestMembers, latestOrders, latestActivity };
  }

  private sanitizeUser(user: any) {
    if (!user) return user;
    const { passwordHash, __v, ...safe } = user;
    return { ...safe, id: user._id?.toString?.() ?? user.id };
  }

  async listUsers(search?: string) {
    const query = search
      ? {
          $or: [
            { name: new RegExp(search, 'i') },
            { email: new RegExp(search, 'i') },
            { handle: new RegExp(search, 'i') },
          ],
        }
      : {};
    const users = await this.users.find(query).sort({ createdAt: -1 }).lean();
    return users.map((u) => this.sanitizeUser(u));
  }

  async getUser(id: string) {
    const user = await this.users.findById(id).lean();
    if (!user) throw new NotFoundException('User not found.');
    return this.sanitizeUser(user);
  }

  async updateUser(id: string, dto: { name?: string; email?: string; password?: string; role?: string }) {
    const update: Record<string, any> = {};
    if (dto.name) update.name = dto.name.trim();
    if (dto.email) update.email = dto.email.toLowerCase().trim();
    if (dto.role) update.role = dto.role;
    if (dto.password) update.passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.users.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
    if (!user) throw new NotFoundException('User not found.');
    return this.sanitizeUser(user);
  }

  async deleteUser(id: string) {
    const user = await this.users.findByIdAndDelete(id).lean();
    if (!user) throw new NotFoundException('User not found.');
    return { success: true };
  }

  async blockUser(id: string, isBlocked: boolean) {
    const user = await this.users.findByIdAndUpdate(id, { $set: { isBlocked } }, { new: true }).lean();
    if (!user) throw new NotFoundException('User not found.');
    return this.sanitizeUser(user);
  }
}
