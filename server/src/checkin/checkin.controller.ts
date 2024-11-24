import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CheckinService } from './checkin.service';
import { ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@ApiSecurity('tma')
@Controller('checkin')
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  @ApiOperation({ summary: '签到' })
  @ApiResponse({
    status: 200,
    description: '签到成功',
  })
  @Post()
  checkin(@CurrentUser() user: User) {
    return this.checkinService.checkin(user);
  }

  @Get()
  getCheckin(@CurrentUser() user: User) {
    return this.checkinService.getCheckin(user);
  }
}
