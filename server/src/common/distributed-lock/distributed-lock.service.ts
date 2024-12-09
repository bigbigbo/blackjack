import { InjectRedis } from '@nestjs-modules/ioredis';
import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import Redlock, { Lock } from 'redlock';

@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);
  private readonly redlock: Redlock;

  constructor(@InjectRedis() private readonly redis: Redis) {
    this.redlock = new Redlock([this.redis], {
      retryCount: 10, // 重试次数
      retryDelay: 200, // 重试延迟
      retryJitter: 200, // 重试延迟的随机值，避免同一时间所有实例同时重试
    });
  }

  async excuteTask<T>(resources: string[], ttl: number, task: () => Promise<T>, lock?: Lock): Promise<T> {
    try {
      if (!lock) {
        lock = await this.redlock.acquire(resources, ttl);
      }
    } catch (error) {
      const errorMsg = `Error excuting task: ${error.message}`;
      this.logger.error(errorMsg, error.stack);
      throw new HttpException(errorMsg, 429);
    }

    try {
      return task();
    } catch (error) {
      this.logger.error(`Internal Server Error: ${error.message}`, error.stack);
      throw new HttpException('Internal Server Error', 500);
    } finally {
      if (lock) {
        try {
          await lock.release();
        } catch (error) {
          this.logger.error(`Error releasing lock: ${error.message}`, error.stack);
          throw new Error(`Error releasing lock: ${error.message}`);
        }
      }
    }
  }

  async excuteTaskUntilSuccess<T>(
    resources: string[],
    ttl: number,
    task: () => Promise<T>,
    retryDelay = 1000,
  ): Promise<T> {
    let lock: Lock;
    while (true) {
      try {
        lock = await this.redlock.acquire(resources, ttl);
        break;
      } catch (error) {
        this.logger.error(`Failed to acquire lock, retrying: ${error.message}`, error.stack);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }

    return this.excuteTask(resources, ttl, task, lock);
  }

  async acquireLock(resources: string[], ttl: number) {
    try {
      const lock = await this.redlock.acquire(resources, ttl);
      return lock;
    } catch (error) {
      const errorMsg = `Error acquiring lock: ${error.message}`;
      throw new Error(errorMsg);
    }
  }

  async releaseLock(lock: Lock) {
    try {
      await lock.release();
    } catch (error) {
      const errorMsg = `Error releasing lock: ${error.message}`;
      throw new Error(errorMsg);
    }
  }
}
