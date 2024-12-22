import { HttpException, Injectable } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import dayjs from 'dayjs';
import { TaskRecord } from '@prisma/client';
import { AssetService } from 'src/asset/asset.service';
import { Type } from 'src/asset/dto/transfer.dto';
@Injectable()
export class TaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assetService: AssetService,
  ) {}

  async findAll(user: User) {
    const tasks = await this.prisma.task.findMany();

    return Promise.all(
      tasks.map(async (task) => {
        const record = await this.prisma.taskRecord.findFirst({
          where: {
            taskId: task.id,
            userId: user.user.id,
          },
        });

        let status = 'unchecked';

        if (record) {
          if (task.type === 'daily') {
            status = dayjs(record.createdAt).isSame(dayjs(), 'day') ? 'checked' : 'unchecked';
          } else {
            status = record.status;
          }
        }

        return {
          ...task,
          status,
        };
      }),
    );
  }

  async check(user: User, id: string) {
    const [record, task] = await Promise.all([
      this.prisma.taskRecord.findFirst({
        where: {
          userId: user.user.id,
          taskId: id,
        },
      }),
      this.prisma.task.findUnique({
        where: {
          id,
        },
      }),
    ]);

    // 如果没有记录，直接创建新记录
    if (!record) {
      return await this.prisma.taskRecord.create({
        data: {
          userId: user.user.id,
          taskId: id,
          status: 'checked',
        },
      });
    }

    // 检查任务是否已完成
    if (record.status === 'completed' || record.status === 'checked') {
      throw new HttpException('Task has already been checked.', 400);
    }

    // 根据任务类型处理
    switch (task.type) {
      case 'daily': {
        const lastCheckedDay = dayjs(record.createdAt).startOf('day');
        const today = dayjs().startOf('day');

        if (lastCheckedDay.isBefore(today, 'day')) {
          return this.prisma.taskRecord.create({
            data: {
              userId: user.user.id,
              taskId: id,
              status: 'checked',
            },
          });
        }

        throw new Error('Daily task has already been checked today.');
      }

      case 'collab': {
        return this.prisma.taskRecord.update({
          where: {
            id: record.id,
          },
          data: {
            status: 'checked',
          },
        });
      }

      default:
        throw new Error('Unknown task type');
    }
  }

  async complete(user: User, id: string) {
    const task = await this.prisma.task.findUnique({
      where: {
        id,
      },
    });

    if (!task) {
      throw new HttpException('Task not found.', 404);
    }

    let record: TaskRecord | null = null;

    switch (task.type) {
      case 'daily': {
        record = await this.prisma.taskRecord.findFirst({
          where: {
            userId: user.user.id,
            taskId: id,
            createdAt: {
              gte: dayjs().startOf('day').toDate(),
            },
          },
        });
        if (!record) {
          throw new HttpException('Daily task has not been checked today.', 400);
        }
      }

      default: {
        record = await this.prisma.taskRecord.findFirst({
          where: {
            userId: user.user.id,
            taskId: id,
            status: 'checked',
          },
        });
        if (!record) {
          throw new HttpException('Task has not been checked.', 400);
        }
      }
    }

    const [fromAsset, toAsset] = await Promise.all([
      this.prisma.asset.findUnique({
        where: { userId_type: { userId: process.env.SYSTEM_USER_ID, type: 'jack' } },
      }),
      this.prisma.asset.findUnique({
        where: { userId_type: { userId: user.user.id, type: 'jack' } },
      }),
    ]);

    const [taskRecord] = await this.prisma.$transaction(async (prisma) => {
      return Promise.all([
        prisma.taskRecord.update({
          where: { id: record.id },
          data: { status: 'completed' },
        }),
        this.assetService.transfer(
          {
            from_user_id: process.env.SYSTEM_USER_ID,
            to_user_id: user.user.id,
            token: 'jack',
            amount: task.reward,
            fromVersion: fromAsset.version,
            toVersion: toAsset.version,
            type: Type.Task,
            remark: `task id: ${id}`,
          },
          prisma,
        ),
      ]);
    });

    return taskRecord;
  }
}
