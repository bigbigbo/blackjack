import { ConflictException, Injectable } from '@nestjs/common';
import { TransferDto } from './dto/transfer.dto';
import { DefaultArgs } from '@prisma/client/runtime/library';
import { AssetTransferTemp, Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { mapping } from 'cassandra-driver';
import { CassandraService } from 'src/common/cassandra/cassandra.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class AssetService {
  assertTransferTempMapper: mapping.ModelMapper<AssetTransferTemp>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cassandra: CassandraService,
  ) {
    const mappingOptions: mapping.MappingOptions = {
      models: {
        AssetTransfer: {
          tables: ['asset_transfer'],
          mappings: new mapping.UnderscoreCqlToCamelCaseMappings(),
        },
      },
    };

    this.assertTransferTempMapper = this.cassandra.createMapper(mappingOptions).forModel('asset_transfer');
  }

  async transfer(
    transferDto: TransferDto,
    prisma: Omit<
      PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>,
      '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
    >,
  ) {
    if (!prisma) {
      prisma = this.prisma;
    }

    const { fromVersion, toVersion, to_user_id, token, amount } = transferDto;

    delete transferDto.fromVersion;
    delete transferDto.toVersion;

    const [toAsset, fromAsset] = await Promise.all([
      prisma.asset.findUnique({
        where: {
          userId_type: { userId: to_user_id, type: token },
        },
      }),
      prisma.asset.findUnique({
        where: {
          userId_type: { userId: transferDto.from_user_id, type: token },
        },
      }),
    ]);

    if (!fromAsset || !toAsset) {
      throw new Error('Asset not found');
    }

    if (fromAsset.version !== fromVersion || toAsset.version !== toVersion) {
      throw new ConflictException('Asset version conflict');
    }

    return Promise.all([
      prisma.asset.update({
        where: {
          userId_type: { userId: to_user_id, type: token },
        },
        data: {
          amount: {
            increment: amount,
          },
          version: {
            increment: 1,
          },
        },
      }),
      prisma.asset.update({
        where: {
          userId_type: { userId: transferDto.from_user_id, type: token },
        },
        data: {
          amount: {
            decrement: amount,
          },
          version: {
            increment: 1,
          },
        },
      }),
      prisma.assetTransferTemp.create({
        data: {
          ...transferDto,
          from_before_amount: fromAsset.amount,
          from_after_amount: fromAsset.amount - amount,
          to_before_amount: toAsset.amount,
          to_after_amount: toAsset.amount + amount,
        },
      }),
    ]);
  }

  @Cron('*/1 * * * * *')
  async syncAssetTransfer() {
    await this.prisma.assetTransferTemp.deleteMany({
      where: { is_handled: true },
    });

    const transfers = await this.prisma.assetTransferTemp.findMany({
      where: { is_handled: false },
      take: 10,
      orderBy: { created_at: 'asc' },
    });

    for (const transfer of transfers) {
      await Promise.all([
        this.assertTransferTempMapper.insert({ ...transfer }),
        this.prisma.assetTransferTemp.update({
          where: { transfer_id: transfer.transfer_id },
          data: { is_handled: true },
        }),
      ]);
    }
  }
}
