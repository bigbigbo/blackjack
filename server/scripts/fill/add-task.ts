import { PrismaClient } from '@prisma/client';
import { v4 } from 'uuid';
async function main() {
  const prisma = new PrismaClient();

  await prisma.task.create({
    data: {
      id: v4(),
      name: '测试任务',
      reward: 100,
      image: 'https://example.com/test.png',
      type: 'daily',
      url: 'https://example.com',
      urlType: 'web',
    },
  });

  await prisma.$disconnect();
}

main().catch((e) => {
  throw e;
});
