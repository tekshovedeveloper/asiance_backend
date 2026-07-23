import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CheckoutDto, ProductAttributeDto, ProductDto, ProductTaxonomyDto } from './dto';
import { ShopService } from './shop.service';

@Controller('shop')
export class ShopController {
  constructor(private readonly shop: ShopService) {}

  @Get('products')
  products(
    @Query('category') category?: string,
    @Query('q') q?: string,
    @Query('admin') admin?: string,
    @Query('status') status?: string,
    @Query('sort') sort?: string,
  ) {
    return this.shop.listProducts({
      category,
      q,
      admin: admin === 'true',
      status,
      sort,
    });
  }

  @Get('categories')
  categories() {
    return this.shop.listCategories();
  }

  @Post('categories')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  createCategory(@Body() dto: ProductTaxonomyDto) {
    return this.shop.saveCategory(dto);
  }

  @Patch('categories/:slug')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  updateCategory(@Param('slug') slug: string, @Body() dto: ProductTaxonomyDto) {
    return this.shop.saveCategory(dto, slug);
  }

  @Delete('categories/:slug')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  deleteCategory(@Param('slug') slug: string) {
    return this.shop.deleteCategory(slug);
  }

  @Get('brands')
  brands() {
    return this.shop.listBrands();
  }

  @Post('brands')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  createBrand(@Body() dto: ProductTaxonomyDto) {
    return this.shop.saveBrand(dto);
  }

  @Patch('brands/:slug')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  updateBrand(@Param('slug') slug: string, @Body() dto: ProductTaxonomyDto) {
    return this.shop.saveBrand(dto, slug);
  }

  @Delete('brands/:slug')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  deleteBrand(@Param('slug') slug: string) {
    return this.shop.deleteBrand(slug);
  }

  @Get('tags')
  tags() {
    return this.shop.listTags();
  }

  @Post('tags')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  createTag(@Body() dto: ProductTaxonomyDto) {
    return this.shop.saveTag(dto);
  }

  @Patch('tags/:slug')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  updateTag(@Param('slug') slug: string, @Body() dto: ProductTaxonomyDto) {
    return this.shop.saveTag(dto, slug);
  }

  @Delete('tags/:slug')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  deleteTag(@Param('slug') slug: string) {
    return this.shop.deleteTag(slug);
  }

  @Get('attributes')
  attributes() {
    return this.shop.listAttributes();
  }

  @Post('attributes')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  createAttribute(@Body() dto: ProductAttributeDto) {
    return this.shop.saveAttribute(dto);
  }

  @Patch('attributes/:slug')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  updateAttribute(@Param('slug') slug: string, @Body() dto: ProductAttributeDto) {
    return this.shop.saveAttribute(dto, slug);
  }

  @Delete('attributes/:slug')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  deleteAttribute(@Param('slug') slug: string) {
    return this.shop.deleteAttribute(slug);
  }

  @Get('products/:slug')
  product(@Param('slug') slug: string) {
    return this.shop.findProduct(slug);
  }

  @Get('members/:handle/purchased-products')
  publicPurchasedProducts(@Param('handle') handle: string) {
    return this.shop.listPublicPurchasedProductsByHandle(handle);
  }

  @Post('products')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  createProduct(@Body() dto: ProductDto) {
    return this.shop.createProduct(dto);
  }

  @Patch('products/:slug')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  updateProduct(@Param('slug') slug: string, @Body() dto: Partial<ProductDto>) {
    return this.shop.updateProduct(slug, dto);
  }

  @Patch('products/:slug/restore')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  restoreProduct(@Param('slug') slug: string) {
    return this.shop.restoreProduct(slug);
  }

  @Delete('products/:slug/permanent')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  permanentDeleteProduct(@Param('slug') slug: string) {
    return this.shop.permanentDeleteProduct(slug);
  }

  @Delete('products/:slug')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  removeProduct(@Param('slug') slug: string) {
    return this.shop.removeProduct(slug);
  }

  // @Post('orders')
  // checkout(@Body() dto: CheckoutDto, @Req() req: any) {
  //   return this.shop.checkout(dto, req.user?.id);
  // }

  // @Get('orders')
  // @UseGuards(AuthGuard('jwt'), RolesGuard)
  // @Roles('admin')
  // orders() {
  //   return this.shop.listOrders();
  // }

  // @Patch('orders/:id')
  // @UseGuards(AuthGuard('jwt'), RolesGuard)
  // @Roles('admin')
  // updateOrder(@Param('id') id: string, @Body('status') status: any) {
  //   return this.shop.updateOrderStatus(id, status);
  // }




  @Post('orders')
  @UseGuards(AuthGuard('jwt'))
  checkout(@Body() dto: CheckoutDto, @CurrentUser() user: any) {
    return this.shop.checkout(dto, user.id);
  }

  @Get('my-orders')
  @UseGuards(AuthGuard('jwt'))
  myOrders(@CurrentUser() user: any) {
    return this.shop.listMyOrders(user.id);
  }

  @Patch('my-orders/:id/cancel')
  @UseGuards(AuthGuard('jwt'))
  cancelMyOrder(@Param('id') id: string, @CurrentUser() user: any) {
    return this.shop.cancelMyOrder(id, user.id);
  }

  @Get('orders')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  orders(
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('includeTrash') includeTrash?: string,
  ) {
    return this.shop.listOrders(status, q, includeTrash === 'true');
  }

  @Get('orders/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  order(@Param('id') id: string) {
    return this.shop.findOrder(id);
  }

  @Patch('orders/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  updateOrder(@Param('id') id: string, @Body() body: any) {
    return this.shop.updateOrder(id, body);
  }

  @Delete('orders/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  trashOrder(@Param('id') id: string) {
    return this.shop.moveOrderToTrash(id);
  }

  @Patch('orders/:id/restore')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  restoreOrder(@Param('id') id: string) {
    return this.shop.restoreOrder(id);
  }

  @Delete('orders/:id/forever')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  deleteOrderForever(@Param('id') id: string) {
    return this.shop.deleteOrderForever(id);
  }



  @Post('orders/:id/send-invoice')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  sendInvoice(@Param('id') id: string) {
    return this.shop.sendInvoiceEmail(id);
  }

  @Post('orders/:id/send-customer-email')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  sendCustomerOrderEmail(@Param('id') id: string, @Body('type') type: any) {
    return this.shop.sendOrderCustomerEmail(id, type);
  }
}
