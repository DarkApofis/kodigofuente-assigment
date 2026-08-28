import { ApiProperty } from '@nestjs/swagger';

export class CategoryResponse {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Bebidas' })
  name: string;

  @ApiProperty()
  createdAt: Date;
}
