import { PrismaClient } from '@prisma/client';
import { v4 } from 'uuid';

async function createSystemAccount() {
  const prisma = new PrismaClient();
  const userId = v4();
  const assetId = v4();
  console.log('userId:', userId);
  await prisma.$transaction(async (prisma) => {
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
          identifier: '0001',
          extraData: JSON.stringify({}),
        },
      }),
      prisma.asset.create({
        data: {
          id: assetId,
          userId,
          type: 'jack',
          amount: 9999999999999,
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
}

createSystemAccount();
