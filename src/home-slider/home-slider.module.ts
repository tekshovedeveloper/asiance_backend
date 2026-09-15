import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContentModule } from '../content/content.module';
import { HomeSlide, HomeSlideSchema } from './home-slide.schema';
import { HomeSliderController } from './home-slider.controller';
import { HomeSliderService } from './home-slider.service';

@Module({
  imports: [ContentModule, MongooseModule.forFeature([{ name: HomeSlide.name, schema: HomeSlideSchema }])],
  controllers: [HomeSliderController],
  providers: [HomeSliderService],
})
export class HomeSliderModule {}
