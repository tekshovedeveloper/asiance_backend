import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, SortOrder, Types } from 'mongoose';
import { slugify } from '../common/slug';
import { CheckoutDto, ProductAttributeDto, ProductDto, ProductTaxonomyDto } from './dto';
import { Order, OrderDocument, OrderStatus } from './order.schema';
import { Product, ProductDocument } from './product.schema';
import {
  ProductAttribute,
  ProductAttributeDocument,
  ProductBrand,
  ProductBrandDocument,
  ProductCategory,
  ProductCategoryDocument,
  ProductTag,
  ProductTagDocument,
} from './product-taxonomy.schema';
import { EmailService } from '../email/email.service';
import type { OrderCustomerEmailType } from '../email/email.service';
import { UsersService } from '../users/users.service';

const orderCustomerEmailLabels: Record<OrderCustomerEmailType, string> = {
  received: 'Order received details',
  packed: 'Order packed',
  pending: 'Payment pending',
  processing: 'Order processing',
  shipped: 'Order shipped',
  completed: 'Order completed',
  cancelled: 'Order cancelled',
  refunded: 'Order refunded',
  failed: 'Order failed',
};

function orderStatusEmailType(status: OrderStatus): OrderCustomerEmailType | null {
  if (status === 'trash') return null;
  return status;
}

@Injectable()
export class ShopService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(ProductCategory.name) private readonly categoryModel: Model<ProductCategoryDocument>,
    @InjectModel(ProductBrand.name) private readonly brandModel: Model<ProductBrandDocument>,
    @InjectModel(ProductTag.name) private readonly tagModel: Model<ProductTagDocument>,
    @InjectModel(ProductAttribute.name) private readonly attributeModel: Model<ProductAttributeDocument>,
    private readonly emailService: EmailService,
    private readonly usersService: UsersService,
  ) {}

  // async listProducts(options: { category?: string; q?: string; admin?: boolean } = {}) {
  //   const query: any = options.admin ? { status: { $ne: 'archived' } } : { status: 'active' };

  //   if (options.category) {
  //     query.$or = [{ category: new RegExp(options.category, 'i') }, { categorySlug: options.category }];
  //   }

  //   if (options.q) {
  //     query.$or = [
  //       { name: new RegExp(options.q, 'i') },
  //       { description: new RegExp(options.q, 'i') },
  //       { category: new RegExp(options.q, 'i') },
  //       { sku: new RegExp(options.q, 'i') },
  //     ];
  //   }

  //   return this.productModel.find(query).sort({ createdAt: -1 }).limit(120).lean();
  // }


  productSort(sort?: string): Record<string, SortOrder> {
    if (sort === 'latest') return { createdAt: -1 };
    if (sort === 'price-asc') return { price: 1, createdAt: -1 };
    if (sort === 'price-desc') return { price: -1, createdAt: -1 };
    if (sort === 'popularity') return { menuOrder: 1, createdAt: -1 };
    if (sort === 'rating') return { enableReviews: -1, createdAt: -1 };

    return { menuOrder: 1, createdAt: -1 };
  }

  async listProducts(options: { category?: string; q?: string; admin?: boolean; status?: string; sort?: string } = {}) {
    const query: any = {};
  
    if (options.admin) {
      if (options.status === 'trash') {
        query.status = 'archived';
      } else if (options.status === 'draft') {
        query.status = 'draft';
      } else if (options.status === 'published') {
        query.status = 'active';
      } else {
        query.status = { $ne: 'archived' };
      }
    } else {
      query.status = 'active';
    }
  
    if (options.category) {
      query.$or = [
        { category: new RegExp(options.category, 'i') },
        { categorySlug: options.category },
      ];
    }
  
    if (options.q) {
      query.$or = [
        { name: new RegExp(options.q, 'i') },
        { description: new RegExp(options.q, 'i') },
        { category: new RegExp(options.q, 'i') },
      ];
    }
  
    return this.productModel.find(query).sort(this.productSort(options.sort)).limit(120).lean();
  }



  async findProduct(slug: string) {
    const product = await this.productModel.findOne({ slug }).lean();

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    return product;
  }

  async createProduct(dto: ProductDto) {
    const categorySlug = dto.categorySlug || slugify(dto.category || 'uncategorized');

    await this.categoryModel.updateOne(
      { slug: categorySlug },
      { $setOnInsert: { name: dto.category || 'Uncategorized', slug: categorySlug } },
      { upsert: true },
    );

    return this.productModel.create({
      ...dto,
      slug: dto.slug || slugify(dto.name),
      categorySlug,
      stock: dto.stock ?? 0,
      stockStatus: dto.stockStatus ?? 'instock',
      stockManagement: dto.stockManagement ?? false,
      soldIndividually: dto.soldIndividually ?? false,
      type: dto.type ?? 'simple',
      virtual: dto.virtual ?? false,
      downloadable: dto.downloadable ?? false,
      tags: dto.tags ?? [],
      brands: dto.brands ?? [],
      images: dto.images ?? [],
      attributes: dto.attributes ?? [],
      variations: dto.variations ?? [],
      menuOrder: dto.menuOrder ?? 0,
      enableReviews: dto.enableReviews ?? true,
      availableForPos: dto.availableForPos ?? true,
      attributeVisible: dto.attributeVisible ?? true,
      status: dto.status ?? 'active',
    });
  }

  async updateProduct(slug: string, dto: Partial<ProductDto>) {
    const update: Partial<ProductDto> = {
      ...dto,
      ...(dto.category && !dto.categorySlug ? { categorySlug: slugify(dto.category) } : {}),
      ...(dto.name && !dto.slug ? { slug: slugify(dto.name) } : {}),
    };
  
    if (dto.images === undefined) {
      delete update.images;
    }
  
    if (dto.attributes === undefined) {
      delete update.attributes;
    }
  
    if (dto.variations === undefined) {
      delete update.variations;
    }
  
    const product = await this.productModel.findOneAndUpdate({ slug }, update, { new: true }).lean();
  
    if (!product) {
      throw new NotFoundException('Product not found.');
    }
  
    return product;
  }

  async removeProduct(slug: string) {
    const product = await this.productModel.findOneAndUpdate({ slug }, { status: 'archived' }, { new: true }).lean();

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    return { archived: true };
  }

  async restoreProduct(slug: string) {
    const product = await this.productModel
      .findOneAndUpdate({ slug }, { status: 'active' }, { new: true })
      .lean();
  
    if (!product) {
      throw new NotFoundException('Product not found.');
    }
  
    return product;
  }
  
  async permanentDeleteProduct(slug: string) {
    const product = await this.productModel.findOneAndDelete({ slug }).lean();
  
    if (!product) {
      throw new NotFoundException('Product not found.');
    }
  
    return { deleted: true };
  }

  async taxonomyCounts(field: 'categorySlug' | 'brands' | 'tags') {
    const rows = await this.productModel.aggregate([
      { $match: { status: { $ne: 'archived' } } },
      ...(field === 'categorySlug' ? [] : [{ $unwind: `$${field}` }]),
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    ]);

    return new Map(rows.filter((row) => row._id).map((row) => [String(row._id), row.count]));
  }

  async listCategories() {
    const [items, counts] = await Promise.all([
      this.categoryModel.find().sort({ name: 1 }).lean(),
      this.taxonomyCounts('categorySlug'),
    ]);

    if (!items.length) {
      const rows = await this.productModel.aggregate([
        { $match: { status: { $ne: 'archived' } } },
        { $group: { _id: '$categorySlug', name: { $first: '$category' }, count: { $sum: 1 } } },
      ]);

      return rows.filter((row) => row._id).map((row) => ({ name: row.name, slug: row._id, count: row.count }));
    }

    return items.map((item) => ({ ...item, count: counts.get(item.slug) ?? 0 }));
  }

  async saveCategory(dto: ProductTaxonomyDto, slug?: string) {
    const payload = { ...dto, slug: dto.slug || slugify(dto.name) };

    return slug
      ? this.categoryModel.findOneAndUpdate({ slug }, payload, { new: true, upsert: true }).lean()
      : this.categoryModel.create(payload);
  }

  async deleteCategory(slug: string) {
    await this.categoryModel.deleteOne({ slug });
    return { deleted: true };
  }

  async listBrands() {
    const [items, counts] = await Promise.all([
      this.brandModel.find().sort({ name: 1 }).lean(),
      this.taxonomyCounts('brands'),
    ]);

    if (!items.length) {
      const rows = await this.productModel.aggregate([
        { $match: { status: { $ne: 'archived' } } },
        { $unwind: '$brands' },
        { $group: { _id: '$brands', count: { $sum: 1 } } },
      ]);

      return rows.filter((row) => row._id).map((row) => ({ name: row._id, slug: row._id, count: row.count }));
    }

    return items.map((item) => ({ ...item, count: counts.get(item.slug) ?? 0 }));
  }

  async saveBrand(dto: ProductTaxonomyDto, slug?: string) {
    const payload = { ...dto, slug: dto.slug || slugify(dto.name) };

    return slug
      ? this.brandModel.findOneAndUpdate({ slug }, payload, { new: true, upsert: true }).lean()
      : this.brandModel.create(payload);
  }

  async deleteBrand(slug: string) {
    await this.brandModel.deleteOne({ slug });
    return { deleted: true };
  }

  async listTags() {
    const [items, counts] = await Promise.all([
      this.tagModel.find().sort({ name: 1 }).lean(),
      this.taxonomyCounts('tags'),
    ]);

    if (!items.length) {
      const rows = await this.productModel.aggregate([
        { $match: { status: { $ne: 'archived' } } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
      ]);

      return rows.filter((row) => row._id).map((row) => ({ name: row._id, slug: row._id, count: row.count }));
    }

    return items.map((item) => ({ ...item, count: counts.get(item.slug) ?? 0 }));
  }

  async saveTag(dto: ProductTaxonomyDto, slug?: string) {
    const payload = { ...dto, slug: dto.slug || slugify(dto.name) };

    return slug
      ? this.tagModel.findOneAndUpdate({ slug }, payload, { new: true, upsert: true }).lean()
      : this.tagModel.create(payload);
  }

  async deleteTag(slug: string) {
    await this.tagModel.deleteOne({ slug });
    return { deleted: true };
  }

  async listAttributes() {
    return this.attributeModel.find().sort({ name: 1 }).lean();
  }

  async saveAttribute(dto: ProductAttributeDto, slug?: string) {
    const payload = { ...dto, slug: dto.slug || slugify(dto.name), terms: dto.terms ?? [] };

    return slug
      ? this.attributeModel.findOneAndUpdate({ slug }, payload, { new: true, upsert: true }).lean()
      : this.attributeModel.create(payload);
  }

  async deleteAttribute(slug: string) {
    await this.attributeModel.deleteOne({ slug });
    return { deleted: true };
  }

  // async checkout(dto: CheckoutDto, userId?: string) {
  //   if (!dto.items?.length) {
  //     throw new BadRequestException('Cart is empty.');
  //   }

  //   const total = dto.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  //   return this.orderModel.create({
  //     ...dto,
  //     userId,
  //     total,
  //     status: 'pending',
  //   });
  // }



  async checkout(dto: CheckoutDto, userId?: string) {
    if (!dto.items?.length) {
      throw new BadRequestException('Cart is empty.');
    }

    // If placed by a logged-in user, use their account's name and email
    let customerName = dto.name;
    let customerEmail = dto.email;
    if (userId) {
      try {
        const account = await this.usersService.findById(userId);
        if (account?.name) customerName = account.name;
        if (account?.email) customerEmail = account.email;
      } catch {
        // user not found — fall back to form data
      }
    }

    const subtotal = dto.items.reduce((sum, item) => {
      return sum + Number(item.price || 0) * Number(item.quantity || 1);
    }, 0);

    const shipping = dto.items.length ? Number(dto.shipping ?? 0) : 0;
    const total = subtotal + shipping;

    const lastOrder = await this.orderModel
      .findOne()
      .sort({ orderNumber: -1 })
      .lean();

    const orderNumber = lastOrder?.orderNumber ? lastOrder.orderNumber + 1 : 10001;

    const order = await this.orderModel.create({
      userId,
      orderNumber,
      status: 'processing',
      customerName,
      email: customerEmail,
      billingName: dto.name || customerName,
      billingEmail: dto.email || customerEmail,
      phone: dto.phone ?? '',
      billingAddress: dto.address,
      shippingAddress: dto.shippingAddress || dto.address,
      orderNotes: dto.notes ?? '',
      paymentMethod: dto.paymentMethod || 'Cash on delivery',
      origin: 'Website checkout',
      items: dto.items.map((item) => ({
        productId: item.productId ?? '',
        slug: item.slug ?? '',
        name: item.name,
        image: item.image ?? '',
        quantity: Number(item.quantity || 1),
        price: Number(item.price || 0),
        total: Number(item.price || 0) * Number(item.quantity || 1),
        selectedVariationName: item.selectedVariationName ?? '',
        selectedAttributes: item.selectedAttributes ?? {},
      })),
      subtotal,
      shipping,
      total,
      notes: [
        {
          message: 'Order created from checkout.',
          type: 'private',
          createdAt: new Date(),
        },
      ],
    });

    return order;
  }

  async listOrders(status?: string, q?: string, includeTrash = false) {
    const filter: any = {};
  
    if (status && status !== 'all') {
      filter.status = status;
    } else if (!includeTrash) {
      filter.status = { $ne: 'trash' };
    }
  
    if (q?.trim()) {
      filter.$or = [
        { orderNumber: { $regex: q.trim(), $options: 'i' } },
        { customerName: { $regex: q.trim(), $options: 'i' } },
        { email: { $regex: q.trim(), $options: 'i' } },
      ];
    }
  
    return this.orderModel.find(filter).sort({ createdAt: -1 });
  }

  async findOrder(id: string) {
    const order = await this.orderModel.findById(id).lean();

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    return order;
  }

  async updateOrderStatus(id: string, status: OrderStatus) {
    return this.updateOrder(id, { status });
  }

  async updateOrder(id: string, payload: { status?: OrderStatus; note?: { message?: string; type?: 'private' | 'customer' } }) {
    const current = await this.orderModel.findById(id).lean();

    if (!current) {
      throw new NotFoundException('Order not found.');
    }

    const update: any = {};
    const notes: Array<{ message: string; type: 'private' | 'customer'; createdAt: Date }> = [];

    if (payload.status && payload.status !== current.status) {
      const emailType = orderStatusEmailType(payload.status);

      if (emailType) {
        await this.emailService.sendOrderCustomerEmail({ ...current, status: payload.status }, emailType);
      }

      update.status = payload.status;
      notes.push({
        message: `Order status changed to ${payload.status}.`,
        type: 'private',
        createdAt: new Date(),
      });

      if (emailType) {
        notes.push({
          message: `${orderCustomerEmailLabels[emailType]} email sent to customer.`,
          type: 'private',
          createdAt: new Date(),
        });
      }
    }

    const noteMessage = payload.note?.message?.trim();
    if (noteMessage) {
      notes.push({
        message: noteMessage,
        type: payload.note?.type === 'customer' ? 'customer' : 'private',
        createdAt: new Date(),
      });
    }

    if (notes.length > 0) {
      update.$push = { notes: { $each: notes } };
    }

    if (Object.keys(update).length === 0) {
      return current;
    }

    const order = await this.orderModel
      .findByIdAndUpdate(
        id,
        update,
        { new: true },
      )
      .lean();

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    return order;
  }

  async moveOrderToTrash(id: string) {
    const order = await this.orderModel
      .findByIdAndUpdate(
        id,
        {
          status: 'trash',
          $push: {
            notes: {
              message: 'Order moved to trash.',
              type: 'private',
              createdAt: new Date(),
            },
          },
        },
        { new: true },
      )
      .lean();

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    return order;
  }

  async restoreOrder(id: string) {
    const order = await this.orderModel
      .findByIdAndUpdate(
        id,
        {
          status: 'processing',
          $push: {
            notes: {
              message: 'Order restored from trash.',
              type: 'private',
              createdAt: new Date(),
            },
          },
        },
        { new: true },
      )
      .lean();

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    return order;
  }

  async deleteOrderForever(id: string) {
    const order = await this.orderModel.findByIdAndDelete(id).lean();

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    return { deleted: true };
  }


  async sendInvoiceEmail(id: string) {
    const order = await this.orderModel.findById(id);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    await this.emailService.sendInvoiceEmail(order);

    return {
      success: true,
      message: 'Invoice email sent',
    };
  }

  async sendOrderCustomerEmail(id: string, type: OrderCustomerEmailType) {
    if (!orderCustomerEmailLabels[type]) {
      throw new BadRequestException('Unsupported order email action.');
    }

    const order = await this.orderModel.findById(id);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    await this.emailService.sendOrderCustomerEmail(order, type);

    const updated = await this.orderModel
      .findByIdAndUpdate(
        id,
        {
          $push: {
            notes: {
              message: `${orderCustomerEmailLabels[type]} email sent to customer.`,
              type: 'private',
              createdAt: new Date(),
            },
          },
        },
        { new: true },
      )
      .lean();

    return {
      success: true,
      message: `${orderCustomerEmailLabels[type]} email sent`,
      order: updated,
    };
  }

  async listMyOrders(userId: string) {
    if (!Types.ObjectId.isValid(userId)) return [];
    const oid = new Types.ObjectId(userId);
    return this.orderModel
      .find({
        $or: [
          { userId: oid },
          { $expr: { $eq: [{ $toString: '$userId' }, userId] } },
        ],
      })
      .sort({ createdAt: -1 })
      .lean();
  }

  async listPublicPurchasedProductsByHandle(handle: string) {
    const member = await this.usersService.findByHandle(handle);
    if (!member?.showProducts || !member.id || !Types.ObjectId.isValid(member.id)) {
      return [];
    }

    const orders = await this.orderModel
      .find({
        userId: new Types.ObjectId(member.id),
        status: { $nin: ['cancelled', 'refunded', 'failed', 'trash'] },
      })
      .sort({ createdAt: -1 })
      .lean();

    const products = new Map<string, {
      key: string;
      name: string;
      slug?: string;
      image?: string;
      quantity: number;
      variationName?: string;
      lastPurchasedAt?: Date;
    }>();

    orders.forEach((order: any) => {
      (order.items ?? []).forEach((item: any) => {
        const name = item.name?.trim();
        if (!name) return;

        const key = item.slug || item.productId || name.toLowerCase();
        const quantity = Number(item.quantity) || 1;
        const existing = products.get(key);

        if (existing) {
          existing.quantity += quantity;
          existing.image = existing.image || item.image;
          existing.slug = existing.slug || item.slug;
          existing.variationName = existing.variationName || item.selectedVariationName;
          if (
            order.createdAt &&
            (!existing.lastPurchasedAt || new Date(order.createdAt) > new Date(existing.lastPurchasedAt))
          ) {
            existing.lastPurchasedAt = order.createdAt;
          }
          return;
        }

        products.set(key, {
          key,
          name,
          slug: item.slug,
          image: item.image,
          quantity,
          variationName: item.selectedVariationName,
          lastPurchasedAt: order.createdAt,
        });
      });
    });

    return Array.from(products.values());
  }

  async cancelMyOrder(orderId: string, userId: string) {
    const order = await this.orderModel.findById(orderId).lean();

    if (!order) throw new NotFoundException('Order not found.');
    if (!order.userId || String(order.userId) !== String(userId)) {
      throw new BadRequestException('Order not found.');
    }

    const cancellable = ['processing', 'pending'];
    if (!cancellable.includes(order.status)) {
      throw new BadRequestException(`Order cannot be cancelled in its current status.`);
    }

    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const age = Date.now() - new Date((order as any).createdAt).getTime();
    if (age > ONE_DAY_MS) {
      throw new BadRequestException('PAST_24H');
    }

    return this.orderModel
      .findByIdAndUpdate(
        orderId,
        {
          status: 'cancelled',
          $push: {
            notes: {
              message: 'Order cancelled by customer.',
              type: 'customer',
              createdAt: new Date(),
            },
          },
        },
        { new: true },
      )
      .lean();
  }
}




  // async listOrders() {
  //   return this.orderModel.find().sort({ createdAt: -1 }).limit(100).lean();
  // }

  // async updateOrderStatus(id: string, status: Order['status']) {
  //   const order = await this.orderModel.findByIdAndUpdate(id, { status }, { new: true }).lean();

  //   if (!order) {
  //     throw new NotFoundException('Order not found.');
  //   }

  //   return order;
  // }
