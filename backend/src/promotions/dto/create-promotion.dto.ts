import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { DiscountType } from '../promotion.enums';
import { HasValidPromotionInvariants } from './promotion-invariants.validator';

export const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

@HasValidPromotionInvariants({ requireTarget: true })
export class CreatePromotionDto {
  @ApiProperty({ example: '10% off drinks', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Target product. Mutually exclusive with categoryId.',
  })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Target category. Mutually exclusive with productId.',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ enum: DiscountType })
  @IsEnum(DiscountType)
  discountType: DiscountType;

  @ApiProperty({
    example: 10,
    description:
      'Between 1 and 100 when discountType is PERCENTAGE; any positive amount for FIXED_AMOUNT',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  discountValue: number;

  @ApiProperty({ example: '2026-09-01', description: 'YYYY-MM-DD' })
  @Matches(ISO_DATE_ONLY, { message: 'startDate must use YYYY-MM-DD format' })
  @IsDateString({ strict: true })
  startDate: string;

  @ApiProperty({
    example: '2026-09-30',
    description: 'YYYY-MM-DD, strictly after startDate',
  })
  @Matches(ISO_DATE_ONLY, { message: 'endDate must use YYYY-MM-DD format' })
  @IsDateString({ strict: true })
  endDate: string;
}
