import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './config/data-source';
import { AppController } from './app.controller';
import { CategoriesModule } from './categories/categories.module';
import { HealthController } from './health/health.controller';
import { ProductsModule } from './products/products.module';
import { PromotionsModule } from './promotions/promotions.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(dataSourceOptions),
    CategoriesModule,
    ProductsModule,
    PromotionsModule,
  ],
  controllers: [AppController, HealthController],
})
export class AppModule {}
