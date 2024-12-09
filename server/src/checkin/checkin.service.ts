import { HttpException, Injectable } from '@nestjs/common';
import { CreateCheckinDto } from './dto/create-checkin.dto';
import { UpdateCheckinDto } from './dto/update-checkin.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as dayjs from 'dayjs';

@Injectable()
export class CheckinService {
  constructor(private readonly prisma: PrismaService) {}

  private getReward(hitDays: number) {
    const rewards = [100, 200, 500, 1000, 1500, 2000, 2500, 3000, 4000, 5000];
    return hitDays > 10 ? rewards[rewards.length - 1] : rewards[hitDays - 1];
  }

  async checkin(user: User) {
    const today = dayjs().startOf('day');

    // 查询今日是否已签到
    const existRecord = await this.prisma.checkInRecord.findFirst({
      where: {
        userId: user.user.id,
        createdAt: {
          gte: today.toDate(),
        },
      },
    });

    if (existRecord) {
      throw new HttpException('You have already checked in today', 400);
    }

    const lastRecord = await this.prisma.checkInRecord.findFirst({
      where: {
        userId: user.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    const lastDate = lastRecord ? dayjs(lastRecord.createdAt) : null;
    const isConsecutive = lastDate ? today.subtract(1, 'day').isSame(lastDate, 'day') : false;
    const nextDay = isConsecutive ? lastRecord.day + 1 : 1;
    const reward = this.getReward(nextDay);

    // 创建签到服务
    const [record] = await this.prisma.$transaction(async (prisma) => {
      return Promise.all([
        prisma.checkInRecord.create({
          data: {
            userId: user.user.id,
            day: nextDay,
          },
        }),
        // TODO: 更新用户积分
        prisma.asset.update({
          where: {
            userId_type: {
              userId: user.user.id,
              type: 'jack',
            },
          },
          data: {
            amount: {
              increment: reward,
            },
          },
        }),
      ]);
    });

    return {
      reward,
      record,
    };
  }

  async getCheckin(user: User) {
    return this.prisma.checkInRecord.findFirst({
      where: {
        userId: user.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
