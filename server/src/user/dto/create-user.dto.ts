import { IsBoolean, IsEnum, IsNotEmptyObject, IsNumber, IsString } from 'class-validator';

class TelegramData {
  @IsNumber()
  'id': number;

  @IsString()
  'first_name': string;

  @IsString()
  'last_name': string;

  @IsString()
  'username': string;

  @IsString()
  'language_code': string;

  @IsBoolean()
  'is_premium': boolean;

  @IsBoolean()
  'allows_write_to_pm': boolean;

  @IsString()
  'hash': string;

  @IsNumber()
  'auth_date': number;

  @IsString()
  'start_param': string;

  @IsString()
  'chat_type': string;

  @IsString()
  'chat_instance': string;
}

export class CreateUserDto {
  @IsEnum(['telegram'])
  type: 'telegram';

  @IsNotEmptyObject()
  data: TelegramData;
}
