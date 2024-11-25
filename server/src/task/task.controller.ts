import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('task')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post('complete/:id')
  complete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.taskService.complete(user, id);
  }

  @Get()
  getTasks(@CurrentUser() user: User) {
    return this.taskService.findAll(user);
  }

  @Post('check/:id')
  check(@CurrentUser() user: User, @Param('id') id: string) {
    return this.taskService.check(user, id);
  }
}
