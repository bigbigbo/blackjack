import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiResponse } from '@nestjs/swagger';

import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@ApiSecurity('tma')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiResponse({
    status: 201,
    description: '成功创建记录',
    type: User,
  })
  @ApiResponse({ status: 400, description: '参数无效' })
  @ApiOperation({ summary: '创建用户' })
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @ApiResponse({
    status: 200,
    description: '成功获取记录',
    type: User,
  })
  @ApiResponse({ status: 401, description: '认证失败' })
  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @ApiResponse({
    status: 200,
    description: '成功获取记录',
    type: User,
  })
  @ApiResponse({ status: 401, description: '认证失败' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
