export const DEFAULT_NEWS_CATEGORIES = [
  { name: 'Beauty', slug: 'beauty', image: '/assets/categories/beauty.png' },
  { name: 'Fashion', slug: 'fashion', image: '/assets/categories/fashion.png' },
  { name: 'Dating', slug: 'dating', image: '/assets/categories/dating.png' },
  { name: 'Weddings', slug: 'weddings', image: '/assets/categories/weddings.png' },
  { name: 'Baby', slug: 'baby', image: '/assets/categories/baby.png' },
  { name: 'Kids', slug: 'kids', image: '/assets/categories/kids.png' },
  { name: 'Travel', slug: 'travel', image: '/assets/categories/travel.png' },
  { name: 'Home', slug: 'home', image: '/assets/categories/home.png' },
  { name: 'Food', slug: 'food', image: '/assets/categories/food.png' },
];

export const LEGACY_NEWS_CATEGORY_MIGRATIONS = [
  { from: 'news', to: 'beauty' },
  { from: 'entertainment', to: 'fashion' },
  { from: 'fashion-beauty', to: 'dating' },
  { from: 'sex-health', to: 'weddings' },
  { from: 'lifestyle', to: 'baby' },
  { from: 'tech', to: 'kids' },
];
