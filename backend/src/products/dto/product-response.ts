import { ApiProperty } from '@nestjs/swagger';

export class ProductResponse {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Café americano 12oz' })
  name: string;

  @ApiProperty({ format: 'uuid' })
  categoryId: string;

  @ApiProperty()
  createdAt: Date;
}
