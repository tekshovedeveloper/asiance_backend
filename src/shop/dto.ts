import { IsArray, IsBoolean, IsEmail, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ProductDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  categorySlug?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  badge?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsArray()
  brands?: string[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsNumber()
  stock?: number;

  @IsOptional()
  @IsBoolean()
  stockManagement?: boolean;

  @IsOptional()
  @IsString()
  stockStatus?: 'instock' | 'outofstock' | 'onbackorder';

  @IsOptional()
  @IsBoolean()
  soldIndividually?: boolean;

  @IsOptional()
  @IsString()
  weight?: string;

  @IsOptional()
  @IsString()
  length?: string;

  @IsOptional()
  @IsString()
  width?: string;

  @IsOptional()
  @IsString()
  height?: string;

  @IsOptional()
  @IsString()
  shippingClass?: string;

  @IsOptional()
  @IsString()
  upsells?: string;

  @IsOptional()
  @IsString()
  crossSells?: string;

  @IsOptional()
  @IsString()
  attributeName?: string;

  @IsOptional()
  @IsString()
  attributeValues?: string;

  @IsOptional()
  @IsBoolean()
  attributeVisible?: boolean;

  @IsOptional()
  @IsString()
  purchaseNote?: string;

  @IsOptional()
  @IsNumber()
  menuOrder?: number;

  @IsOptional()
  @IsBoolean()
  enableReviews?: boolean;

  @IsOptional()
  @IsBoolean()
  availableForPos?: boolean;

  @IsOptional()
  @IsString()
  type?: 'simple' | 'variable' | 'grouped' | 'external';

  @IsOptional()
  @IsBoolean()
  virtual?: boolean;

  @IsOptional()
  @IsBoolean()
  downloadable?: boolean;

  @IsOptional()
  @IsArray()
  attributes?: Array<{
    name: string;
    values: string[];
    visible: boolean;
    variation: boolean;
  }>;

  @IsOptional()
  @IsArray()
  variations?: Array<{
    id?: string;
    name: string;
    attributes: Record<string, string>;
    sku?: string;
    price?: number;
    salePrice?: number;
    stock?: number;
    stockStatus?: 'instock' | 'outofstock' | 'onbackorder';
    image?: string;
    enabled?: boolean;
  }>;


  @IsOptional()
  @IsArray()
  details?: Array<{
    title: string;
    description: string;
  }>;

  @IsOptional()
  @IsString()
  status?: 'active' | 'draft' | 'archived';
}





export class CheckoutDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsNumber()
  shipping?: number;

  @IsArray()
  items: Array<{
    productId?: string;
    slug?: string;
    name: string;
    image?: string;
    quantity: number;
    price: number;
    selectedVariationName?: string;
    selectedAttributes?: Record<string, string>;
  }>;
}




export class ProductTaxonomyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  parentSlug?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  displayType?: string;
}

export class ProductAttributeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsBoolean()
  enableArchives?: boolean;

  @IsOptional()
  @IsString()
  sortOrder?: string;

  @IsOptional()
  @IsArray()
  terms?: string[];
}
