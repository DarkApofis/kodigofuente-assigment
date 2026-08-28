export type PromotionStatus = 'SCHEDULED' | 'ACTIVE' | 'ENDED';
export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  createdAt: string;
}

export interface Promotion {
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
  createdAt: string;
  updatedAt: string;
}

export interface PromotionsSummary {
  byStatus: Record<PromotionStatus, number>;
  activeToday: number;
}

export interface CreatePromotionInput {
  name: string;
  productId?: string;
  categoryId?: string;
  discountType: DiscountType;
  discountValue: number;
  startDate: string;
  endDate: string;
}
