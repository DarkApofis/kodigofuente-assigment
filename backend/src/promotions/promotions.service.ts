import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { todayInAppTimezone } from '../common/clock';
import { Category } from '../categories/category.entity';
import { Product } from '../products/product.entity';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { Promotion } from './promotion.entity';
import { DiscountType, PromotionStatus } from './promotion.enums';
import { getInvariantViolations } from './promotion-invariants';
import { canTransition } from './promotion-status.machine';
import { isActiveOn } from './promotion-vigency';

export interface PromotionView {
  id: string;
  name: string;
  productId: string | null;
  categoryId: string | null;
  discountType: DiscountType;
  discountValue: number;
  startDate: string;
  endDate: string;
  status: PromotionStatus;
  isActiveToday: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromotionsSummary {
  byStatus: Record<PromotionStatus, number>;
  activeToday: number;
}

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotions: Repository<Promotion>,
    @InjectRepository(Product)
    private readonly products: Repository<Product>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
  ) {}

  async create(dto: CreatePromotionDto): Promise<PromotionView> {
    await this.assertTargetExists(
      dto.productId ?? null,
      dto.categoryId ?? null,
    );

    const promotion = this.promotions.create({
      name: dto.name,
      productId: dto.productId ?? null,
      categoryId: dto.categoryId ?? null,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      startDate: dto.startDate,
      endDate: dto.endDate,
      status: PromotionStatus.SCHEDULED,
    });
    const saved = await this.promotions.save(promotion);
    return this.toView(saved, todayInAppTimezone());
  }

  async findAll(status?: PromotionStatus): Promise<PromotionView[]> {
    const today = todayInAppTimezone();
    const all = await this.promotions.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
    });
    return all.map((promotion) => this.toView(promotion, today));
  }

  async update(id: string, dto: UpdatePromotionDto): Promise<PromotionView> {
    const promotion = await this.getOrFail(id);
    if (promotion.status === PromotionStatus.ENDED) {
      throw new ConflictException('An ENDED promotion cannot be modified');
    }

    // Providing a new target replaces the previous one (XOR is preserved)
    const targetChanged =
      dto.productId !== undefined || dto.categoryId !== undefined;
    if (dto.productId !== undefined) {
      promotion.productId = dto.productId;
      promotion.categoryId = null;
    }
    if (dto.categoryId !== undefined) {
      promotion.categoryId = dto.categoryId;
      promotion.productId = null;
    }
    if (dto.name !== undefined) promotion.name = dto.name;
    if (dto.discountType !== undefined)
      promotion.discountType = dto.discountType;
    if (dto.discountValue !== undefined)
      promotion.discountValue = dto.discountValue;
    if (dto.startDate !== undefined) promotion.startDate = dto.startDate;
    if (dto.endDate !== undefined) promotion.endDate = dto.endDate;

    // Partial payloads pass DTO validation alone; the merged result must
    // still satisfy every invariant
    const violations = getInvariantViolations(promotion, {
      requireTarget: true,
    });
    if (violations.length > 0) {
      throw new BadRequestException(violations);
    }
    if (targetChanged) {
      await this.assertTargetExists(promotion.productId, promotion.categoryId);
    }

    const saved = await this.promotions.save(promotion);
    return this.toView(saved, todayInAppTimezone());
  }

  async changeStatus(id: string, dto: ChangeStatusDto): Promise<PromotionView> {
    const promotion = await this.getOrFail(id);
    if (!canTransition(promotion.status, dto.status)) {
      throw new ConflictException(
        `Invalid status transition: ${promotion.status} -> ${dto.status}`,
      );
    }
    promotion.status = dto.status;
    const saved = await this.promotions.save(promotion);
    return this.toView(saved, todayInAppTimezone());
  }

  async remove(id: string): Promise<void> {
    const promotion = await this.getOrFail(id);
    if (promotion.status !== PromotionStatus.SCHEDULED) {
      throw new ConflictException('Only SCHEDULED promotions can be deleted');
    }
    await this.promotions.remove(promotion);
  }

  async getSummary(): Promise<PromotionsSummary> {
    const today = todayInAppTimezone();
    const all = await this.promotions.find();

    const byStatus: Record<PromotionStatus, number> = {
      [PromotionStatus.SCHEDULED]: 0,
      [PromotionStatus.ACTIVE]: 0,
      [PromotionStatus.ENDED]: 0,
    };
    for (const promotion of all) {
      byStatus[promotion.status] += 1;
    }

    return {
      byStatus,
      activeToday: all.filter((promotion) => isActiveOn(promotion, today))
        .length,
    };
  }

  private async getOrFail(id: string): Promise<Promotion> {
    const promotion = await this.promotions.findOne({ where: { id } });
    if (!promotion) {
      throw new NotFoundException(`Promotion ${id} not found`);
    }
    return promotion;
  }

  private async assertTargetExists(
    productId: string | null,
    categoryId: string | null,
  ): Promise<void> {
    if (productId) {
      const product = await this.products.findOne({ where: { id: productId } });
      if (!product) {
        throw new NotFoundException(`Product ${productId} not found`);
      }
    }
    if (categoryId) {
      const category = await this.categories.findOne({
        where: { id: categoryId },
      });
      if (!category) {
        throw new NotFoundException(`Category ${categoryId} not found`);
      }
    }
  }

  private toView(promotion: Promotion, today: string): PromotionView {
    return {
      id: promotion.id,
      name: promotion.name,
      productId: promotion.productId,
      categoryId: promotion.categoryId,
      discountType: promotion.discountType,
      discountValue: promotion.discountValue,
      startDate: promotion.startDate,
      endDate: promotion.endDate,
      status: promotion.status,
      isActiveToday: isActiveOn(promotion, today),
      createdAt: promotion.createdAt,
      updatedAt: promotion.updatedAt,
    };
  }
}
