import { Body, Controller, Get, Patch, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateMeDto } from './dto/update-me.dto';



@Controller('members')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Query('q') search?: string) {
    return this.users.list(search);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@CurrentUser() user: any) {
    return this.users.getMe(user.id); // ✅ return DashboardUser shape
  }

  @Patch('me')
  @UseGuards(AuthGuard('jwt'))
  updateMe(@CurrentUser() user: any, @Body() body: UpdateMeDto) {
    return this.users.updateMeProfile(user.id, body); // ✅ safe update
  }

  @Post(':id/follow')
  @UseGuards(AuthGuard('jwt'))
  follow(@CurrentUser() user: any, @Param('id') targetId: string) {
    return this.users.follow(user.id, targetId);
  }

  @Get(':handle')
  find(@Param('handle') handle: string) {
    return this.users.findByHandle(handle);
  }
}