import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class ListProductsQueryDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Filter by category' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
