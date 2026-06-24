import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateShippingMethodDto } from './dto/create-shipping-method.dto';
import { CreateShippingZoneDto } from './dto/create-shipping-zone.dto';
import { ShippingService } from './shipping.service';

@Controller('shop/shipping')
export class ShippingController {
  constructor(private readonly shipping: ShippingService) {}

  @Get('zones')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  listZones() {
    return this.shipping.listZones();
  }

  @Post('zones')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  createZone(@Body() dto: CreateShippingZoneDto) {
    return this.shipping.createZone(dto);
  }

  @Patch('zones/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  updateZone(@Param('id') id: string, @Body() dto: CreateShippingZoneDto) {
    return this.shipping.updateZone(id, dto);
  }

  @Delete('zones/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  deleteZone(@Param('id') id: string) {
    return this.shipping.deleteZone(id);
  }

  @Post('zones/:zoneId/methods')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  addMethod(@Param('zoneId') zoneId: string, @Body() dto: CreateShippingMethodDto) {
    return this.shipping.addMethod(zoneId, dto);
  }

  @Patch('zones/:zoneId/methods/:methodId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  updateMethod(
    @Param('zoneId') zoneId: string,
    @Param('methodId') methodId: string,
    @Body() dto: Partial<CreateShippingMethodDto>,
  ) {
    return this.shipping.updateMethod(zoneId, methodId, dto);
  }

  @Delete('zones/:zoneId/methods/:methodId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  deleteMethod(@Param('zoneId') zoneId: string, @Param('methodId') methodId: string) {
    return this.shipping.deleteMethod(zoneId, methodId);
  }

  @Get('options')
  checkoutOptions(@Query('total') total: string, @Query('region') region?: string) {
    return this.shipping.checkoutOptions(Number(total || 0), region);
  }
}