import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CheckinService } from './checkin.service';
import { ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { DistributedLock } from 'src/common/distributed-lock/distributed-lock.decorators';
import { DistributedLockService } from 'src/common/distributed-lock/distributed-lock.service';

@ApiSecurity('tma')
@Controller('checkin')
export class CheckinController {
  constructor(
    private readonly checkinService: CheckinService,
    private readonly distributedLockService: DistributedLockService,
  ) {}

  @ApiOperation({ summary: '签到' })
  @ApiResponse({
    status: 200,
    description: '签到成功',
  })
  @Post()
  checkin(@CurrentUser() user: User) {
    return this.distributedLockService.excuteTask([`checkin:${user.user.id}`], 4 * 1000, () =>
      this.checkinService.checkin(user),
    );
  }

  @Get()
  getCheckin(@CurrentUser() user: User) {
    return this.checkinService.getCheckin(user);
  }
}
