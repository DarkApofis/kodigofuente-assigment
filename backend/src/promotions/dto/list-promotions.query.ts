import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PromotionStatus } from '../promotion.enums';

export class ListPromotionsQueryDto {
  @ApiPropertyOptional({
    enum: PromotionStatus,
    description: 'Filter by status',
  })
  @IsOptional()
  @IsEnum(PromotionStatus)
  status?: PromotionStatus;
}
