import { ApiProperty } from '@nestjs/swagger';
import { DiscountType, PromotionStatus } from '../promotion.enums';

export class PromotionResponse {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: '10% off drinks' })
  name: string;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  productId: string | null;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  categoryId: string | null;

  @ApiProperty({ enum: DiscountType })
  discountType: DiscountType;

  @ApiProperty({ example: 10 })
  discountValue: number;

  @ApiProperty({ example: '2026-09-01' })
  startDate: string;

  @ApiProperty({ example: '2026-09-30' })
  endDate: string;

  @ApiProperty({ enum: PromotionStatus })
  status: PromotionStatus;

  @ApiProperty({
    description:
      'Derived, never stored: status is ACTIVE and today (in APP_TIMEZONE) falls within [startDate, endDate]',
  })
  isActiveToday: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PromotionsSummaryResponse {
  @ApiProperty({
    example: { SCHEDULED: 2, ACTIVE: 1, ENDED: 3 },
    description: 'Promotion count per status',
  })
  byStatus: Record<PromotionStatus, number>;

  @ApiProperty({ example: 1, description: 'Promotions in force today' })
  activeToday: number;
}
