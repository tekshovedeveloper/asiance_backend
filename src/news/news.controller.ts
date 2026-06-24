import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { NewsCategoryDto, NewsItemDto } from './dto';
import { NewsService } from './news.service';

@Controller('news')
export class NewsController {
  constructor(private readonly news: NewsService) {}

  @Get('admin/items')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  adminItems() {
    return this.news.listItems({ includeDrafts: true });
  }

  @Get('categories')
  categories() {
    return this.news.listCategories();
  }

  @Post('categories')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  createCategory(@Body() dto: NewsCategoryDto) {
    return this.news.createCategory(dto);
  }

  @Patch('categories/:slug')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  updateCategory(@Param('slug') slug: string, @Body() dto: Partial<NewsCategoryDto>) {
    return this.news.updateCategory(slug, dto);
  }

  @Delete('categories/:slug')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  removeCategory(@Param('slug') slug: string) {
    return this.news.removeCategory(slug);
  }

  @Get()
  list(
    @Query('category') category?: string,
    @Query('q') q?: string,
    @Query('featured') featured?: string,
    @Query('breaking') breaking?: string,
    @Query('limit') limit?: string,
  ) {
    return this.news.listItems({ category, q, featured, breaking, limit });
  }

  @Get(':slug')
  find(@Param('slug') slug: string) {
    return this.news.findBySlug(slug);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  create(@Body() dto: NewsItemDto) {
    return this.news.createItem(dto);
  }

  @Patch(':slug')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  update(@Param('slug') slug: string, @Body() dto: Partial<NewsItemDto>) {
    return this.news.updateItem(slug, dto);
  }

  @Delete(':slug')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  remove(@Param('slug') slug: string) {
    return this.news.removeItem(slug);
  }
}
