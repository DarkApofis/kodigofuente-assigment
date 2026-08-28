import { ApiPropertyOptional } from '@nestjs/swagger';
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
import { ISO_DATE_ONLY } from './create-promotion.dto';
import { HasValidPromotionInvariants } from './promotion-invariants.validator';

// All fields optional: absent means "keep the stored value". Kept explicit
// (no PartialType) so the class-level validator runs with requireTarget: false;
// the service re-checks the full invariants after merging with the stored row.
@HasValidPromotionInvariants({ requireTarget: false })
export class UpdatePromotionDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'New target product; replaces any previous category target',
  })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'New target category; replaces any previous product target',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: DiscountType })
  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  discountValue?: number;

  @ApiPropertyOptional({ example: '2026-09-01', description: 'YYYY-MM-DD' })
  @IsOptional()
  @Matches(ISO_DATE_ONLY, { message: 'startDate must use YYYY-MM-DD format' })
  @IsDateString({ strict: true })
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-09-30', description: 'YYYY-MM-DD' })
  @IsOptional()
  @Matches(ISO_DATE_ONLY, { message: 'endDate must use YYYY-MM-DD format' })
  @IsDateString({ strict: true })
  endDate?: string;
}
