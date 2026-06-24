import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ContentService } from './content.service';
import { ArticleDto } from './dto';

@Controller('articles')
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get()
  list(@Query('category') category?: string, @Query('q') q?: string) {
    return this.content.list({ category, q });
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
