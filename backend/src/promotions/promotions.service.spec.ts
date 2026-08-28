import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Category } from '../categories/category.entity';
import { Product } from '../products/product.entity';
import { Promotion } from './promotion.entity';
import { DiscountType, PromotionStatus } from './promotion.enums';
import { PromotionsService } from './promotions.service';

const { SCHEDULED, ACTIVE, ENDED } = PromotionStatus;

const PRODUCT_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const CATEGORY_ID = '9b2b7a1e-6c3d-4e5f-8a90-1b2c3d4e5f60';
const PROMOTION_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

// Date ranges that are unambiguous regardless of when the tests run
const PAST_RANGE = { startDate: '2000-01-01', endDate: '2000-01-31' };
const CURRENT_RANGE = { startDate: '2000-01-01', endDate: '2999-12-31' };

function promotion(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: PROMOTION_ID,
    name: 'Test promotion',
    productId: PRODUCT_ID,
    categoryId: null,
    product: null,
    category: null,
    discountType: DiscountType.PERCENTAGE,
    discountValue: 10,
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    status: SCHEDULED,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('PromotionsService', () => {
  let service: PromotionsService;

  const promotionsRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((input: Partial<Promotion>) => input as Promotion),
    save: jest.fn((input: Promotion) => Promise.resolve(input)),
    remove: jest.fn(),
  };
  const productsRepo = { findOne: jest.fn() };
  const categoriesRepo = { findOne: jest.fn() };

  beforeAll(() => {
    process.env.APP_TIMEZONE = 'America/Bogota';
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        PromotionsService,
        { provide: getRepositoryToken(Promotion), useValue: promotionsRepo },
        { provide: getRepositoryToken(Product), useValue: productsRepo },
        { provide: getRepositoryToken(Category), useValue: categoriesRepo },
      ],
    }).compile();

    service = moduleRef.get(PromotionsService);
  });

  describe('create', () => {
    it('a new promotion always starts as SCHEDULED', async () => {
      productsRepo.findOne.mockResolvedValue({ id: PRODUCT_ID });

      const created = await service.create({
        name: '10% off coffee',
        productId: PRODUCT_ID,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        startDate: '2026-09-01',
        endDate: '2026-09-30',
      });

      expect(created.status).toBe(SCHEDULED);
      expect(promotionsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: SCHEDULED }),
      );
    });

    it('a promotion cannot target a product that does not exist', async () => {
      productsRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create({
          name: '10% off ghost product',
          productId: PRODUCT_ID,
          discountType: DiscountType.PERCENTAGE,
          discountValue: 10,
          startDate: '2026-09-01',
          endDate: '2026-09-30',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(promotionsRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('an ENDED promotion cannot be modified', async () => {
      promotionsRepo.findOne.mockResolvedValue(promotion({ status: ENDED }));

      await expect(
        service.update(PROMOTION_ID, { name: 'New name' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(promotionsRepo.save).not.toHaveBeenCalled();
    });

    it('a partial update cannot leave the date range inverted', async () => {
      promotionsRepo.findOne.mockResolvedValue(
        promotion({ startDate: '2026-09-01', endDate: '2026-09-30' }),
      );

      // endDate alone passes DTO validation; the merged result must not
      await expect(
        service.update(PROMOTION_ID, { endDate: '2026-08-15' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(promotionsRepo.save).not.toHaveBeenCalled();
    });

    it('retargeting to a category clears the product (XOR preserved)', async () => {
      promotionsRepo.findOne.mockResolvedValue(
        promotion({ productId: PRODUCT_ID, categoryId: null }),
      );
      categoriesRepo.findOne.mockResolvedValue({ id: CATEGORY_ID });

      const updated = await service.update(PROMOTION_ID, {
        categoryId: CATEGORY_ID,
      });

      expect(updated.categoryId).toBe(CATEGORY_ID);
      expect(updated.productId).toBeNull();
    });

    it('retargeting to a product clears the category (XOR preserved)', async () => {
      promotionsRepo.findOne.mockResolvedValue(
        promotion({ productId: null, categoryId: CATEGORY_ID }),
      );
      productsRepo.findOne.mockResolvedValue({ id: PRODUCT_ID });

      const updated = await service.update(PROMOTION_ID, {
        productId: PRODUCT_ID,
      });

      expect(updated.productId).toBe(PRODUCT_ID);
      expect(updated.categoryId).toBeNull();
    });

    it('retargeting to a category that does not exist is rejected', async () => {
      promotionsRepo.findOne.mockResolvedValue(promotion());
      categoriesRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(PROMOTION_ID, { categoryId: CATEGORY_ID }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(promotionsRepo.save).not.toHaveBeenCalled();
    });

    it('updating a promotion that does not exist returns not found', async () => {
      promotionsRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(PROMOTION_ID, { name: 'Ghost' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('a SCHEDULED promotion can be renamed', async () => {
      promotionsRepo.findOne.mockResolvedValue(
        promotion({ status: SCHEDULED }),
      );

      const updated = await service.update(PROMOTION_ID, { name: 'Renamed' });

      expect(updated.name).toBe('Renamed');
      expect(promotionsRepo.save).toHaveBeenCalled();
    });
  });

  describe('changeStatus', () => {
    it('a scheduled promotion can be activated', async () => {
      promotionsRepo.findOne.mockResolvedValue(
        promotion({ status: SCHEDULED }),
      );

      const updated = await service.changeStatus(PROMOTION_ID, {
        status: ACTIVE,
      });

      expect(updated.status).toBe(ACTIVE);
    });

    it('an active promotion can be ended', async () => {
      promotionsRepo.findOne.mockResolvedValue(promotion({ status: ACTIVE }));

      const updated = await service.changeStatus(PROMOTION_ID, {
        status: ENDED,
      });

      expect(updated.status).toBe(ENDED);
    });

    it('a promotion cannot skip from SCHEDULED straight to ENDED', async () => {
      promotionsRepo.findOne.mockResolvedValue(
        promotion({ status: SCHEDULED }),
      );

      await expect(
        service.changeStatus(PROMOTION_ID, { status: ENDED }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(promotionsRepo.save).not.toHaveBeenCalled();
    });

    it('an ended promotion cannot be reactivated', async () => {
      promotionsRepo.findOne.mockResolvedValue(promotion({ status: ENDED }));

      await expect(
        service.changeStatus(PROMOTION_ID, { status: ACTIVE }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('remove', () => {
    it('a SCHEDULED promotion can be deleted', async () => {
      const stored = promotion({ status: SCHEDULED });
      promotionsRepo.findOne.mockResolvedValue(stored);

      await service.remove(PROMOTION_ID);

      expect(promotionsRepo.remove).toHaveBeenCalledWith(stored);
    });

    it('an ACTIVE promotion cannot be deleted', async () => {
      promotionsRepo.findOne.mockResolvedValue(promotion({ status: ACTIVE }));

      await expect(service.remove(PROMOTION_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(promotionsRepo.remove).not.toHaveBeenCalled();
    });

    it('an ENDED promotion cannot be deleted', async () => {
      promotionsRepo.findOne.mockResolvedValue(promotion({ status: ENDED }));

      await expect(service.remove(PROMOTION_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(promotionsRepo.remove).not.toHaveBeenCalled();
    });
  });

  describe('findAll (derived isActiveToday)', () => {
    it('marks as in force only ACTIVE promotions whose range covers today', async () => {
      promotionsRepo.find.mockResolvedValue([
        promotion({ id: '1', status: ACTIVE, ...CURRENT_RANGE }),
        promotion({ id: '2', status: ACTIVE, ...PAST_RANGE }),
        promotion({ id: '3', status: SCHEDULED, ...CURRENT_RANGE }),
      ]);

      const views = await service.findAll();
      const byId = new Map(views.map((view) => [view.id, view.isActiveToday]));

      expect(byId.get('1')).toBe(true);
      expect(byId.get('2')).toBe(false); // ACTIVE but its dates already passed
      expect(byId.get('3')).toBe(false); // right dates but not ACTIVE
    });
  });

  describe('getSummary', () => {
    it('counts by status and only date-valid ACTIVE promotions count as in force', async () => {
      promotionsRepo.find.mockResolvedValue([
        promotion({ id: '1', status: SCHEDULED }),
        promotion({ id: '2', status: ACTIVE, ...CURRENT_RANGE }),
        promotion({ id: '3', status: ACTIVE, ...PAST_RANGE }),
        promotion({ id: '4', status: ENDED }),
      ]);

      const summary = await service.getSummary();

      expect(summary.byStatus).toEqual({
        [SCHEDULED]: 1,
        [ACTIVE]: 2,
        [ENDED]: 1,
      });
      expect(summary.activeToday).toBe(1);
    });
  });
});
