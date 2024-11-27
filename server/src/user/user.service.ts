import { HttpException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { v4 } from 'uuid';
import { validate, parse } from '@telegram-apps/init-data-node';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  validateTelegramData(data: string) {
    try {
      validate(parse(data), process.env.BOT_TOKEN, {
        expiresIn: 60 * 60 * 24,
      });
    } catch (error) {
      throw new HttpException('Invalid telegram data', 400);
    }
  }

  async createWithTelegram(createUserDto: CreateUserDto) {
    const userId = v4();
    const [user, authAccount, asset, setting] = await this.prismaService.$transaction(async (prisma) => {
      return await Promise.all([
        prisma.user.create({
          data: {
            id: userId,
            exp: 0,
            level: 1,
            image: '',
          },
        }),
        prisma.authAccount.create({
          data: {
            userId,
            type: 'telegram',
            identifier: String(createUserDto.data.id),
            extraData: JSON.stringify(createUserDto.data),
          },
        }),
        prisma.asset.create({
          data: {
            userId,
            type: 'jack',
            amount: 0,
          },
        }),
        prisma.setting.create({
          data: {
            userId,
            language: 'en',
          },
        }),
      ]);
    });

    return {
      user,
      authAccount,
      asset,
      setting,
    };
  }

  async create(createUserDto: CreateUserDto) {
    if (createUserDto.type === 'telegram') {
      return await this.createWithTelegram(createUserDto);
    }
    throw new HttpException('Invalid parameters', 400);
  }

  findAll() {
    return this.prismaService.user.findMany();
  }

  async findOne(initData: string) {
    const parsedInitData = parse(initData);
    this.validateTelegramData(initData);

    const authAccount = await this.prismaService.authAccount.findUnique({
      where: {
        type_identifier: {
          type: 'telegram',
          identifier: String(parsedInitData.user.id),
        },
      },
    });

    if (!authAccount) {
      throw new HttpException('Unauthorized', 401);
    }

    const [user, asset, setting] = await Promise.all([
      this.prismaService.user.findUnique({
        where: {
          id: authAccount.userId,
        },
      }),
      this.prismaService.asset.findUnique({
        where: {
          userId_type: {
            userId: authAccount.userId,
            type: 'jack',
          },
        },
      }),
      this.prismaService.setting.findUnique({
        where: {
          userId: authAccount.userId,
        },
      }),
    ]);

    return {
      user,
      authAccount,
      asset,
      setting,
    };
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    return this.prismaService.user.update({
      where: {
        id,
      },
      data: updateUserDto,
    });
  }

  remove(id: string) {
    return this.prismaService.user.delete({
      where: {
        id,
      },
    });
  }

  updateSetting(user: User, updateSettingDto: UpdateSettingDto) {
    return this.prismaService.setting.update({
      where: { userId: user.user.id },
      data: updateSettingDto,
    });
  }
}
