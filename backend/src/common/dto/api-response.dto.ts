import { ApiProperty } from '@nestjs/swagger';

export class ApiSuccessDto {
  @ApiProperty({ example: true, enum: [true] })
  success!: true;

  @ApiProperty({ required: false, example: 'Операцію виконано' })
  message?: string;

  @ApiProperty({ required: false, type: Object })
  data?: Record<string, unknown>;
}

export class ApiErrorDto {
  @ApiProperty({ example: false, enum: [false] }) success!: false;
  @ApiProperty({ example: 'VALIDATION_ERROR' }) code!: string;
  @ApiProperty({ example: 'Некоректні дані' }) message!: string;
  @ApiProperty({ required: false, type: Object }) details?: Record<string, unknown>;
}
