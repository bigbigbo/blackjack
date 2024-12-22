import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { CassandraModule } from './common/cassandra/cassandra.module';
import { ScheduleModule } from '@nestjs/schedule';

import { UserModule } from './user/user.module';
import { AuthMiddleware } from './middlewares/auth.middleware';
import { CheckinModule } from './checkin/checkin.module';
import { TaskModule } from './task/task.module';
import { DistributedLockModule } from './common/distributed-lock/distributed-lock.module';
import { AssetModule } from './asset/asset.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule.forRoot({
      type: 'single',
      url: process.env.REDIS_URL,
    }),
    ScheduleModule.forRoot(),
    CassandraModule,
    DistributedLockModule,
    UserModule,
    CheckinModule,
    TaskModule,
    AssetModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude({
        path: 'user',
        method: RequestMethod.POST,
      })
      .forRoutes({
        path: '*',
        method: RequestMethod.ALL,
      });
  }
}
