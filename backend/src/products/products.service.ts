import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly products: Repository<Product>,
  ) {}

  findAll(categoryId?: string): Promise<Product[]> {
    return this.products.find({
      where: categoryId ? { categoryId } : {},
      order: { name: 'ASC' },
    });
  }
}
