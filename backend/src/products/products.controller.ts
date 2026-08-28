import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ListProductsQueryDto } from './dto/list-products.query';
import { ProductResponse } from './dto/product-response';
import { Product } from './product.entity';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products, optionally filtered by category' })
  @ApiOkResponse({ type: ProductResponse, isArray: true })
  findAll(@Query() query: ListProductsQueryDto): Promise<Product[]> {
    return this.productsService.findAll(query.categoryId);
  }
}
