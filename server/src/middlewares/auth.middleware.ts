import { HttpException, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly userService: UserService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const [authType, authData = ''] = (req.header('authorization') || '').split(' ');

    if (authType !== 'tma') {
      return next(new HttpException('Unauthorized', 401));
    }

    try {
      this.userService.validateTelegramData(authData);
      res.locals.user = await this.userService.findOne(authData);

      // 如果请求的是用户信息，则直接返回
      if (req.url === '/user' && req.method === 'GET') {
        return res.json(res.locals.user);
      }

      return next();
    } catch (e) {
      return next(new HttpException('Unauthorized', 401));
    }
  }
}
