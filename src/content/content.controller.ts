import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ContentService } from './content.service';
import { ArticleCategoryDto, ArticleDto } from './dto';

@Controller('articles')
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get()
  list(@Query('category') category?: string, @Query('q') q?: string) {
    return this.content.list({ category, q });
  }

  @Get('admin/items')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  adminList(@Query('category') category?: string, @Query('q') q?: string, @Query('status') status?: string) {
    return this.content.list({ category, q, status, includeDrafts: true });
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  myArticles(@CurrentUser() user: any, @Query('status') status?: string) {
    return this.content.listMine(user.id, status);
  }

  @Get('categories')
  listCategories() {
    return this.content.listCategories();
  }

  @Post('categories')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  createCategory(@Body() dto: ArticleCategoryDto) {
    return this.content.createCategory(dto);
  }

  @Patch('categories/:slug')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  updateCategory(@Param('slug') slug: string, @Body() dto: Partial<ArticleCategoryDto>) {
    return this.content.updateCategory(slug, dto);
  }

  @Delete('categories/:slug')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  removeCategory(@Param('slug') slug: string) {
    return this.content.removeCategory(slug);
  }

  @Get(':slug')
  find(@Param('slug') slug: string) {
    return this.content.findBySlug(slug);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  create(@Body() dto: ArticleDto) {
    return this.content.create(dto);
  }

  @Post('submit')
  @UseGuards(AuthGuard('jwt'))
  submit(@CurrentUser() user: any, @Body() dto: ArticleDto) {
    return this.content.submit(dto, user);
  }

  @Patch(':slug/approve')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  approve(@Param('slug') slug: string) {
    return this.content.approve(slug);
  }

  @Patch(':slug')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  update(@Param('slug') slug: string, @Body() dto: Partial<ArticleDto>) {
    return this.content.update(slug, dto);
  }

  @Delete(':slug')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  remove(@Param('slug') slug: string) {
    return this.content.remove(slug);
  }
}
