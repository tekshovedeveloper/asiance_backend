import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  stats() {
    return this.admin.stats();
  }

  @Get('overview')
  overview() {
    return this.admin.overview();
  }

  @Get('users')
  listUsers(@Query('search') search?: string) {
    return this.admin.listUsers(search);
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.admin.getUser(id);
  }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() body: { name?: string; email?: string; password?: string; role?: string }) {
    return this.admin.updateUser(id, body);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.admin.deleteUser(id);
  }

  @Patch('users/:id/block')
  blockUser(@Param('id') id: string, @Body('isBlocked') isBlocked: boolean) {
    return this.admin.blockUser(id, isBlocked);
  }
}
