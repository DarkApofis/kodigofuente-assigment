import { ApiProperty } from '@nestjs/swagger';

// Shape produced by AllExceptionsFilter for every expected error
export class ApiErrorResponse {
  @ApiProperty({ example: 409 })
  statusCode: number;

  @ApiProperty({
    example: 'Only SCHEDULED promotions can be deleted',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  })
  message: string | string[];

  @ApiProperty({ example: 'Conflict' })
  error: string;

  @ApiProperty({ example: '2026-08-28T15:00:00.000Z' })
  timestamp: string;

  @ApiProperty({
    example: '/api/promotions/3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  })
  path: string;
}
