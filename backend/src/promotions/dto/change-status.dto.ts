import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PromotionStatus } from '../promotion.enums';

export class ChangeStatusDto {
  @ApiProperty({
    enum: PromotionStatus,
    example: PromotionStatus.ACTIVE,
    description: 'Target status; only SCHEDULED -> ACTIVE -> ENDED is allowed',
  })
  @IsEnum(PromotionStatus)
  status: PromotionStatus;
}
