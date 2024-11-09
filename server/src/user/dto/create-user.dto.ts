import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: '用户等级',
    default: 0,
  })
  level: number;

  @ApiProperty({
    description: '经验值',
    default: 0,
  })
  exp: number;

  @ApiProperty({
    description: '用户头像',
    example: 'https://example.com/avatar.png',
  })
  image: string;
}
