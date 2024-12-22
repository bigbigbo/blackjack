import { CallHandler, ExecutionContext, HttpException, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { DistributedLockService } from './distributed-lock.service';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

@Injectable()
export class DistributedLockInterceptor implements NestInterceptor {
  constructor(
    @Inject(DistributedLockService) private readonly lockService: DistributedLockService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const handler = context.getHandler();
    const resources = this.reflector.get('lock_resources', handler) || [];
    const ttl = this.reflector.get('lock_ttl', handler) || 1000;

    try {
      await this.lockService.acquireLock(resources, ttl);
      return next.handle();
    } catch (error) {
      throw new HttpException(`Too many requests, please try again later.`, 420);
    }
  }
}
