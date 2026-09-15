import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { HomeSlideDto } from './dto';
import { HomeSliderService } from './home-slider.service';

@Controller('home-slides')
export class HomeSliderController {
  constructor(private readonly slider: HomeSliderService) {}

  @Get()
  list() {
    return this.slider.list();
  }

  @Get('admin/items')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  adminList() {
    return this.slider.list(true);
  }

  @Get('admin/articles')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  articles() {
    return this.slider.selectableArticles();
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  create(@Body() dto: HomeSlideDto) {
    return this.slider.create(dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: HomeSlideDto) {
    return this.slider.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.slider.remove(id);
  }
}
