import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppController } from '../src/app.controller';
import { configureApp } from '../src/app.setup';
import { CategoriesController } from '../src/categories/categories.controller';
import { CategoriesService } from '../src/categories/categories.service';
import { Category } from '../src/categories/category.entity';
import { HealthController } from '../src/health/health.controller';
import { Product } from '../src/products/product.entity';
import { ProductsController } from '../src/products/products.controller';
import { ProductsService } from '../src/products/products.service';
import { Promotion } from '../src/promotions/promotion.entity';
import { PromotionsController } from '../src/promotions/promotions.controller';
import { PromotionsService } from '../src/promotions/promotions.service';

// Minimal in-memory stand-in for a TypeORM repository. The HTTP layer under
// test (routing, pipes, filter, status codes) is fully real; only storage is
// faked so the suite runs without a database.
class InMemoryRepository<
  T extends { id?: string; createdAt?: Date; updatedAt?: Date },
> {
  readonly rows = new Map<string, T>();

  create(input: Partial<T>): T {
    return { ...input } as T;
  }

  async save(entity: T): Promise<T> {
    if (!entity.id) entity.id = randomUUID();
    entity.createdAt = entity.createdAt ?? new Date();
    entity.updatedAt = new Date();
    this.rows.set(entity.id, { ...entity });
    return Promise.resolve(entity);
  }

  async find(options?: { where?: Partial<T> }): Promise<T[]> {
    const where = options?.where ?? {};
    const matches = [...this.rows.values()].filter((row) =>
      Object.entries(where).every(
        ([key, value]) => value === undefined || row[key as keyof T] === value,
      ),
    );
    return Promise.resolve(matches);
  }

  async findOne(options: { where: Partial<T> }): Promise<T | null> {
    const found = await this.find({ where: options.where });
    return found[0] ?? null;
  }

  async remove(entity: T): Promise<T> {
    if (entity.id) this.rows.delete(entity.id);
    return Promise.resolve(entity);
  }
}

// Wide date range so "today" is always inside it, whenever the suite runs
const OPEN_RANGE = { startDate: '2000-01-01', endDate: '2999-12-31' };

describe('Promotions API (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let categoryId: string;
  let productId: string;

  const promotionsRepo = new InMemoryRepository<Promotion>();
  const productsRepo = new InMemoryRepository<Product>();
  const categoriesRepo = new InMemoryRepository<Category>();

  beforeAll(async () => {
    process.env.APP_TIMEZONE = 'America/Bogota';

    const moduleRef = await Test.createTestingModule({
      controllers: [
        AppController,
        HealthController,
        CategoriesController,
        ProductsController,
        PromotionsController,
      ],
      providers: [
        CategoriesService,
        ProductsService,
        PromotionsService,
        { provide: getRepositoryToken(Promotion), useValue: promotionsRepo },
        { provide: getRepositoryToken(Product), useValue: productsRepo },
        { provide: getRepositoryToken(Category), useValue: categoriesRepo },
        {
          provide: getDataSourceToken(),
          useValue: { query: jest.fn().mockResolvedValue([{ '?column?': 1 }]) },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    server = app.getHttpServer();

    const category = await categoriesRepo.save({ name: 'Bebidas' } as Category);
    categoryId = category.id;
    const product = await productsRepo.save({
      name: 'Café americano 12oz',
      categoryId,
    } as Product);
    productId = product.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('routing and prefix', () => {
    it('GET /health responds at the root, outside the /api prefix', async () => {
      const response = await request(server).get('/health').expect(200);
      expect(response.body).toMatchObject({ status: 'ok', database: 'up' });
    });

    it('GET /api/health does not exist (health is excluded from the prefix)', async () => {
      await request(server).get('/api/health').expect(404);
    });

    it('GET /api/categories lists the catalog', async () => {
      const response = await request(server).get('/api/categories').expect(200);
      expect(response.body).toEqual([
        expect.objectContaining({ name: 'Bebidas' }),
      ]);
    });

    it('GET /api/products filters by category', async () => {
      const all = await request(server).get('/api/products').expect(200);
      expect(all.body).toHaveLength(1);

      const other = await request(server)
        .get(`/api/products?categoryId=${randomUUID()}`)
        .expect(200);
      expect(other.body).toEqual([]);
    });
  });

  describe('promotion lifecycle', () => {
    let promotionId: string;

    it('POST /api/promotions creates a promotion that starts as SCHEDULED (201)', async () => {
      const response = await request(server)
        .post('/api/promotions')
        .send({
          name: '10% off coffee',
          productId,
          discountType: 'PERCENTAGE',
          discountValue: 10,
          ...OPEN_RANGE,
        })
        .expect(201);

      expect(response.body.status).toBe('SCHEDULED');
      expect(response.body.isActiveToday).toBe(false);
      promotionId = response.body.id;
    });

    it('GET /api/promotions?status= filters by status', async () => {
      const scheduled = await request(server)
        .get('/api/promotions?status=SCHEDULED')
        .expect(200);
      expect(scheduled.body).toHaveLength(1);

      const ended = await request(server)
        .get('/api/promotions?status=ENDED')
        .expect(200);
      expect(ended.body).toEqual([]);
    });

    it('PATCH /api/promotions/:id renames a scheduled promotion (200)', async () => {
      const response = await request(server)
        .patch(`/api/promotions/${promotionId}`)
        .send({ name: '15% off coffee', discountValue: 15 })
        .expect(200);
      expect(response.body.name).toBe('15% off coffee');
    });

    it('PATCH /api/promotions/:id/status activates it and isActiveToday becomes true (200)', async () => {
      const response = await request(server)
        .patch(`/api/promotions/${promotionId}/status`)
        .send({ status: 'ACTIVE' })
        .expect(200);

      expect(response.body.status).toBe('ACTIVE');
      expect(response.body.isActiveToday).toBe(true);
    });

    it('DELETE on an ACTIVE promotion returns 409 with the consistent error body', async () => {
      const response = await request(server)
        .delete(`/api/promotions/${promotionId}`)
        .expect(409);

      expect(response.body).toMatchObject({
        statusCode: 409,
        message: 'Only SCHEDULED promotions can be deleted',
        error: 'Conflict',
        path: `/api/promotions/${promotionId}`,
      });
      expect(typeof response.body.timestamp).toBe('string');
    });

    it('going back from ACTIVE to SCHEDULED returns 409', async () => {
      await request(server)
        .patch(`/api/promotions/${promotionId}/status`)
        .send({ status: 'SCHEDULED' })
        .expect(409);
    });

    it('GET /api/promotions/summary reflects counts and vigency', async () => {
      const response = await request(server)
        .get('/api/promotions/summary')
        .expect(200);
      expect(response.body).toEqual({
        byStatus: { SCHEDULED: 0, ACTIVE: 1, ENDED: 0 },
        activeToday: 1,
      });
    });

    it('an ended promotion rejects further edits with 409', async () => {
      await request(server)
        .patch(`/api/promotions/${promotionId}/status`)
        .send({ status: 'ENDED' })
        .expect(200);

      await request(server)
        .patch(`/api/promotions/${promotionId}`)
        .send({ name: 'Too late' })
        .expect(409);
    });

    it('a SCHEDULED promotion can be deleted (204, then gone from the list)', async () => {
      const created = await request(server)
        .post('/api/promotions')
        .send({
          name: 'Short-lived promo',
          categoryId,
          discountType: 'FIXED_AMOUNT',
          discountValue: 500,
          ...OPEN_RANGE,
        })
        .expect(201);

      await request(server)
        .delete(`/api/promotions/${created.body.id}`)
        .expect(204);

      const scheduled = await request(server)
        .get('/api/promotions?status=SCHEDULED')
        .expect(200);
      expect(scheduled.body).toEqual([]);
    });
  });

  describe('expected errors, never a 500', () => {
    it('a 150% discount returns 400 with the consistent error body', async () => {
      const response = await request(server)
        .post('/api/promotions')
        .send({
          name: 'Impossible discount',
          productId,
          discountType: 'PERCENTAGE',
          discountValue: 150,
          ...OPEN_RANGE,
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.error).toBe('Bad Request');
      expect(response.body.path).toBe('/api/promotions');
      expect(JSON.stringify(response.body.message)).toContain(
        'between 1 and 100',
      );
    });

    it('unknown payload fields are rejected (forbidNonWhitelisted)', async () => {
      await request(server)
        .post('/api/promotions')
        .send({
          name: 'Sneaky payload',
          productId,
          discountType: 'PERCENTAGE',
          discountValue: 10,
          ...OPEN_RANGE,
          status: 'ACTIVE', // trying to skip the SCHEDULED start
        })
        .expect(400);
    });

    it('operating on a promotion that does not exist returns 404', async () => {
      await request(server)
        .delete(`/api/promotions/${randomUUID()}`)
        .expect(404);
    });

    it('a malformed uuid in the path returns 400, not 500', async () => {
      await request(server).delete('/api/promotions/not-a-uuid').expect(400);
    });
  });
});
