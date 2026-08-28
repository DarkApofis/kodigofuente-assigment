import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Category } from '../categories/category.entity';
import { Product } from '../products/product.entity';
import { Promotion } from '../promotions/promotion.entity';
import { InitialSchema1787788800000 } from '../migrations/1787788800000-InitialSchema';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: requireEnv('POSTGRES_HOST'),
  port: Number(requireEnv('POSTGRES_PORT')),
  username: requireEnv('POSTGRES_USER'),
  password: requireEnv('POSTGRES_PASSWORD'),
  database: requireEnv('POSTGRES_DB'),
  entities: [Category, Product, Promotion],
  migrations: [InitialSchema1787788800000],
  // Schema changes go through explicit migrations only — never auto-sync
  synchronize: false,
  logging: ['error', 'warn', 'migration'],
};

export const AppDataSource = new DataSource(dataSourceOptions);
