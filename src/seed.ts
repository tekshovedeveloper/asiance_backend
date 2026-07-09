import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { AppModule } from './app.module';
import { Activity } from './community/activity.schema';
import { FileAsset } from './community/file-asset.schema';
import { ForumThread } from './community/forum-thread.schema';
import { Group } from './community/group.schema';
import { MessageThread } from './community/message-thread.schema';
import { Article } from './content/article.schema';
import { DEFAULT_NEWS_CATEGORIES } from './news/defaults';
import { NewsCategory } from './news/news-category.schema';
import { NewsItem } from './news/news-item.schema';
import { Order } from './shop/order.schema';
import { Product } from './shop/product.schema';
import { User } from './users/user.schema';

const products = [
  {
    name: 'The silk slip dress',
    slug: 'the-silk-slip-dress',
    category: 'Essentials',
    price: 320,
    image: 'https://picsum.photos/seed/asiance-fashion-1/900/700',
    badge: 'new',
    description: 'Bias-cut silk with a quiet neckline and enough structure for day or evening.',
    stock: 18,
  },
  {
    name: 'Amber serum no. 03',
    slug: 'amber-serum-no-03',
    category: 'Apothecary',
    price: 88,
    image: 'https://picsum.photos/seed/asiance-object-4/900/700',
    description: 'A lightweight botanical serum for a slow, luminous morning routine.',
    stock: 44,
  },
  {
    name: 'Ceramic carafe',
    slug: 'ceramic-carafe',
    category: 'Objects',
    price: 145,
    image: 'https://picsum.photos/seed/asiance-object-1/900/700',
    badge: 'limited',
    description: 'Hand-glazed stoneware with a soft silhouette for bedside water or table rituals.',
    stock: 9,
  },
  {
    name: 'Slow ritual candle',
    slug: 'slow-ritual-candle',
    category: 'Apothecary',
    price: 64,
    image: 'https://picsum.photos/seed/asiance-object-2/900/700',
    description: 'Cedar, rose, and clean smoke poured into a reusable ceramic vessel.',
    stock: 31,
  },
  {
    name: 'Brass pendant lamp',
    slug: 'brass-pendant-lamp',
    category: 'Objects',
    price: 320,
    image: 'https://picsum.photos/seed/asiance-interior-1/900/700',
    description: 'A warm brass pendant for corners, reading rooms, and softer evenings.',
    stock: 12,
  },
  {
    name: 'Woven basket bag',
    slug: 'woven-basket-bag',
    category: 'Accessories',
    price: 195,
    image: 'https://picsum.photos/seed/asiance-bag-1/900/700',
    badge: 'restock',
    description: 'Market-ready woven raffia with leather handles and a generous interior.',
    stock: 24,
  },
];

const articles = [
  {
    title: 'Should you try gentle contrast therapy?',
    slug: 'gentle-contrast-therapy',
    category: 'Sex & Health',
    excerpt:
      'A measured guide to hot, cold, and the ritual in between, with notes from bathhouse founders and clinicians.',
    content:
      'Contrast therapy has become a social ritual as much as a recovery tool. Start gently, keep the temperature shifts moderate, and listen closely to your body. The best version is less about extremes and more about presence: a few minutes of heat, a brief cool rinse, and a calm transition back to room temperature.',
    image: 'https://picsum.photos/seed/asiance-wellness-1/1200/760',
    authorName: 'Asiance Editors',
    tags: ['wellbeing', 'ritual', 'health'],
    discussionCount: 47,
    featured: true,
  },
  {
    title: 'The sweater superlatives: 15 of spring’s most notable knits',
    slug: 'spring-knit-superlatives',
    category: 'Fashion & Beauty',
    excerpt: 'A soft, luxurious knit remains one of our greatest sartorial delights.',
    content:
      'This spring’s knits are lighter, cleaner, and quietly detailed: ribbed cardigans, open-weave pullovers, and the kind of cotton crewneck that lives beside a swimsuit or a tailored trouser.',
    image: 'https://picsum.photos/seed/asiance-knit-1/1200/760',
    authorName: 'Marie Schmidt',
    tags: ['fashion', 'spring'],
    discussionCount: 22,
    featured: true,
  },
  {
    title: 'Meet fashion’s new it sneaker',
    slug: 'fashion-new-it-sneaker',
    category: 'Lifestyle',
    excerpt: 'The shoe making tailored trousers, denim, and airy dresses feel newly practical.',
    content:
      'The new sneaker is less technical and more architectural: low-profile, tonal, and just structured enough to make a simple outfit feel intentional.',
    image: 'https://picsum.photos/seed/asiance-shoes-1/1200/760',
    authorName: 'Iris Halden',
    tags: ['fashion', 'lifestyle'],
    discussionCount: 33,
    featured: false,
  },
];

const newsItems = [
  {
    title: 'Asiance opens a weekly editor briefing for members',
    slug: 'asiance-weekly-editor-briefing',
    categoryName: 'News',
    categorySlug: 'news',
    excerpt:
      'A tighter Monday digest will collect community highlights, product drops, and editorial notes in one place.',
    content:
      'The weekly editor briefing is designed as a single useful signal: new stories, active conversations, shop notes, and category updates from the Asiance team.',
    image: 'https://picsum.photos/seed/asiance-news-digest/1200/760',
    authorName: 'Asiance Editors',
    tags: ['community', 'editorial'],
    featured: true,
    breaking: true,
    sourceName: 'Asiance',
    sourceUrl: 'https://asiance.co',
    status: 'published',
  },
  {
    title: 'Five transportive novels that will take you somewhere else',
    slug: 'transportive-novels-news',
    categoryName: 'Entertainment',
    categorySlug: 'entertainment',
    excerpt: 'A reading list for long flights, quiet weekends, and the soft hour before sleep.',
    content:
      'The best travel reading does not always involve a map. These novels move by mood: humid kitchens, train platforms, islands, hotels, and private weather.',
    image: 'https://picsum.photos/seed/asiance-books-news/1200/760',
    authorName: 'jack',
    tags: ['books', 'culture'],
    featured: false,
    breaking: false,
    sourceName: 'Asiance Culture',
    status: 'published',
  },
  {
    title: 'The sweater superlatives: spring knits worth noting',
    slug: 'spring-knit-superlatives-news',
    categoryName: 'Fashion and Beauty',
    categorySlug: 'fashion-beauty',
    excerpt: 'A soft, luxurious knit remains one of our quietest sartorial delights.',
    content:
      'This season leans into ribbed cardigans, open-weave pullovers, and cotton crewnecks that work beside swimsuits or tailored trousers.',
    image: 'https://picsum.photos/seed/asiance-knit-news/1200/760',
    authorName: 'Marie Schmidt',
    tags: ['fashion', 'spring'],
    featured: true,
    breaking: false,
    sourceName: 'Asiance Style',
    status: 'published',
  },
  {
    title: 'Should you try gentle contrast therapy?',
    slug: 'gentle-contrast-therapy-news',
    categoryName: 'Sex and Health',
    categorySlug: 'sex-health',
    excerpt:
      'A measured guide to hot, cold, and the ritual in between, with notes from bathhouse founders and clinicians.',
    content:
      'Contrast therapy has become a social ritual as much as a recovery tool. Start gently, keep temperature shifts moderate, and listen closely to your body.',
    image: 'https://picsum.photos/seed/asiance-wellness-news/1200/760',
    authorName: 'Asiance Editors',
    tags: ['wellbeing', 'health'],
    featured: false,
    breaking: false,
    sourceName: 'Asiance Health',
    status: 'published',
  },
  {
    title: 'Meet fashion new low-profile sneaker mood',
    slug: 'fashion-new-sneaker-mood',
    categoryName: 'Lifestyle',
    categorySlug: 'lifestyle',
    excerpt: 'The shoe making tailored trousers, denim, and airy dresses feel newly practical.',
    content:
      'The new sneaker is less technical and more architectural: low-profile, tonal, and structured enough to make simple outfits feel intentional.',
    image: 'https://picsum.photos/seed/asiance-shoes-news/1200/760',
    authorName: 'Iris Halden',
    tags: ['fashion', 'lifestyle'],
    featured: false,
    breaking: true,
    sourceName: 'Asiance Lifestyle',
    status: 'published',
  },
  {
    title: 'A quieter way to test new wellness tech',
    slug: 'quieter-way-to-test-wellness-tech',
    categoryName: 'Tech',
    categorySlug: 'tech',
    excerpt: 'Small devices, fewer dashboards, and metrics that actually change a daily ritual.',
    content:
      'The best wellness technology disappears into a routine. Our editors look for devices that reduce friction rather than create another screen to manage.',
    image: 'https://picsum.photos/seed/asiance-tech-news/1200/760',
    authorName: 'Asiance Editors',
    tags: ['tech', 'wellbeing'],
    featured: false,
    breaking: false,
    sourceName: 'Asiance Tech',
    status: 'published',
  },
];

const groups = [
  {
    name: 'The Morning Circle',
    slug: 'the-morning-circle',
    category: 'Rituals',
    privacy: 'private',
    description: 'Coffee, cold water, stretching, journaling, and the tiny decisions that set a day.',
    image: 'https://picsum.photos/seed/asiance-circle-morning/900/600',
    membersCount: 312,
    tags: ['ritual', 'morning'],
  },
  {
    name: 'Quiet Interiors',
    slug: 'quiet-interiors',
    category: 'Home',
    privacy: 'public',
    description: 'Rooms with restraint: linen, paper lamps, stone, wood, books, and useful emptiness.',
    image: 'https://picsum.photos/seed/asiance-circle-interiors/900/600',
    membersCount: 540,
    tags: ['home', 'objects'],
  },
  {
    name: 'Slow Ferments',
    slug: 'slow-ferments',
    category: 'Food',
    privacy: 'public',
    description: 'Kimchi, koji, sourdough, shrubs, pickles, and patient kitchen experiments.',
    image: 'https://picsum.photos/seed/asiance-circle-ferments/900/600',
    membersCount: 128,
    tags: ['food', 'wellbeing'],
  },
  {
    name: 'Archival Denim',
    slug: 'archival-denim',
    category: 'Fashion',
    privacy: 'public',
    description: 'Fits, repairs, fades, vintage sources, and denim that improves by living.',
    image: 'https://picsum.photos/seed/asiance-circle-denim/900/600',
    membersCount: 221,
    tags: ['fashion'],
  },
  {
    name: 'newyork Rituals',
    slug: 'karachi-rituals',
    category: 'Local',
    privacy: 'public',
    description: 'Chai houses, fabric markets, evening walks, and city notes from Karachi members.',
    image: 'https://picsum.photos/seed/asiance-circle-karachi/900/600',
    membersCount: 47,
    tags: ['karachi', 'local'],
  },
];

const members = [
  {
    name: 'Admin',
    email: 'admin@asiance.co',
    handle: 'admin',
    role: 'admin',
    bio: 'Asiance editorial and community admin.',
    location: 'Seoul / Karachi',
    status: 'active now',
    interests: ['editorial', 'commerce', 'community'],
  },
  {
    name: 'Mira Tanaka',
    email: 'mira@asiance.co',
    handle: 'miratanaka',
    role: 'member',
    bio: 'Ceramics, morning walks, quiet hotels, and long-form beauty writing.',
    location: 'Kyoto, Japan',
    status: 'active 3 minutes ago',
    interests: ['objects', 'travel', 'ritual'],
  },
  {
    name: 'jack',
    email: 'noor@asiance.co',
    handle: 'jack',
    role: 'member',
    bio: 'Karachi-based reader, event host, and collector of excellent cotton.',
    location: 'Karachi, Pakistan',
    status: 'active 20 minutes ago',
    interests: ['fashion', 'books', 'local'],
  },
  {
    name: 'Iris Halden',
    email: 'iris@asiance.co',
    handle: 'irishalden',
    role: 'member',
    bio: 'Fermentation notes, interior references, and too many linen shirts.',
    location: 'Copenhagen, Denmark',
    status: 'active 2 hours ago',
    interests: ['food', 'interiors'],
  },
];

const activity = [
  {
    actorName: 'Mira Tanaka',
    actorHandle: 'miratanaka',
    type: 'post',
    text: 'A grey Kyoto morning. Hot water, a slow pour, and the new ceramic carafe is exactly right in the hand.',
    targetName: 'The Morning Circle',
    targetSlug: 'the-morning-circle',
    likes: 42,
    comments: 8,
    media: [{ type: 'image', url: 'https://picsum.photos/seed/asiance-activity-1/900/600', caption: 'Kyoto morning ritual' }],
  },
  {
    actorName: 'Iris Halden',
    actorHandle: 'irishalden',
    type: 'thread',
    text: 'started a thread on countertop ferments that do not take over the whole apartment.',
    targetName: 'Slow Ferments',
    targetSlug: 'slow-ferments',
    likes: 18,
    comments: 14,
    media: [{ type: 'image', url: 'https://picsum.photos/seed/asiance-activity-2/900/600', caption: 'Countertop ferments' }],
  },
  {
    actorName: 'jack',
    actorHandle: 'jack',
    type: 'comment',
    text: 'left a note on gentle contrast therapy: start softer than you think.',
    targetName: 'Gentle Contrast Therapy',
    targetSlug: 'gentle-contrast-therapy',
    likes: 23,
    comments: 4,
  },
];

const threads = [
  {
    title: 'What makes a morning ritual actually last?',
    slug: 'what-makes-a-morning-ritual-last',
    category: 'Rituals',
    groupSlug: 'the-morning-circle',
    authorName: 'Mira Tanaka',
    excerpt: 'Tiny repeatable steps, generous timing, and not making the routine too precious.',
    replies: 34,
    pinned: true,
    lastActivityAt: new Date(),
  },
  {
    title: 'Favorite low-light lamps for rented apartments',
    slug: 'favorite-low-light-lamps',
    category: 'Home',
    groupSlug: 'quiet-interiors',
    authorName: 'Iris Halden',
    excerpt: 'Looking for warm pools of light, no electrician required.',
    replies: 19,
    pinned: false,
    lastActivityAt: new Date(),
  },
  {
    title: 'Karachi fabric market route for first-timers',
    slug: 'karachi-fabric-market-route',
    category: 'Local',
    groupSlug: 'karachi-rituals',
    authorName: 'jack',
    excerpt: 'A gentle half-day route with tea stops and trusted shops.',
    replies: 11,
    pinned: false,
    lastActivityAt: new Date(),
  },
];

const files = [
  {
    title: 'Spring lookbook notes',
    type: 'doc',
    category: 'Editorial',
    size: '88 KB',
    ownerName: 'Asiance Editors',
  },
  {
    title: 'Kyoto pop-up moodboard',
    type: 'media',
    category: 'Events',
    size: '42 MB',
    ownerName: 'Mira Tanaka',
  },
  {
    title: 'Community launch checklist',
    type: 'file',
    category: 'Operations',
    size: '19 KB',
    ownerName: 'Admin',
  },
];

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const passwordHash = await bcrypt.hash('Admin12345', 12);

  const userModel = app.get<Model<User>>(getModelToken(User.name));
  const productModel = app.get<Model<Product>>(getModelToken(Product.name));
  const articleModel = app.get<Model<Article>>(getModelToken(Article.name));
  const newsModel = app.get<Model<NewsItem>>(getModelToken(NewsItem.name));
  const newsCategoryModel = app.get<Model<NewsCategory>>(getModelToken(NewsCategory.name));
  const groupModel = app.get<Model<Group>>(getModelToken(Group.name));
  const activityModel = app.get<Model<Activity>>(getModelToken(Activity.name));
  const threadModel = app.get<Model<ForumThread>>(getModelToken(ForumThread.name));
  const fileModel = app.get<Model<FileAsset>>(getModelToken(FileAsset.name));
  const messageModel = app.get<Model<MessageThread>>(getModelToken(MessageThread.name));
  const orderModel = app.get<Model<Order>>(getModelToken(Order.name));

  await Promise.all([
    userModel.deleteMany({}),
    productModel.deleteMany({}),
    articleModel.deleteMany({}),
    newsModel.deleteMany({}),
    newsCategoryModel.deleteMany({}),
    groupModel.deleteMany({}),
    activityModel.deleteMany({}),
    threadModel.deleteMany({}),
    fileModel.deleteMany({}),
    messageModel.deleteMany({}),
    orderModel.deleteMany({}),
  ]);

  const createdUsers = await userModel.insertMany(
    members.map((member) => ({
      ...member,
      passwordHash,
      isVerified: true,
      avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(member.name)}`,
    })),
  );

  const mira = createdUsers.find((user) => user.handle === 'miratanaka');
  const admin = createdUsers.find((user) => user.handle === 'admin');

  await Promise.all([
    productModel.insertMany(products),
    articleModel.insertMany(articles),
    newsCategoryModel.insertMany(
      DEFAULT_NEWS_CATEGORIES.map((category, index) => ({ ...category, sortOrder: index })),
    ),
    newsModel.insertMany(newsItems),
    groupModel.insertMany(groups),
    activityModel.insertMany(activity),
    threadModel.insertMany(threads),
    fileModel.insertMany(files),
    messageModel.create({
      title: 'Mira and Admin',
      participants: [admin?._id, mira?._id].filter(Boolean),
      messages: [
        {
          senderId: mira?._id,
          senderName: 'Mira Tanaka',
          body: 'Could we feature the ceramic carafe in next week’s letter?',
        },
        {
          senderId: admin?._id,
          senderName: 'Admin',
          body: 'Yes. I’ll pair it with the morning ritual edit.',
        },
      ],
      lastMessageAt: new Date(),
    }),
  ]);

  await app.close();
  console.log('Seeded Asiance data. Admin login: admin@asiance.co / Admin12345');
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
