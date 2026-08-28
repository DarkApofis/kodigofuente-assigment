import { request } from './client';
import type {
  Category,
  CreatePromotionInput,
  Product,
  Promotion,
  PromotionStatus,
  PromotionsSummary,
} from './types';

export function getSummary(): Promise<PromotionsSummary> {
  return request<PromotionsSummary>('/promotions/summary');
}

export function listPromotions(): Promise<Promotion[]> {
  return request<Promotion[]>('/promotions');
}

export function listProducts(): Promise<Product[]> {
  return request<Product[]>('/products');
}

export function listCategories(): Promise<Category[]> {
  return request<Category[]>('/categories');
}

export function createPromotion(
  input: CreatePromotionInput,
): Promise<Promotion> {
  return request<Promotion>('/promotions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function changePromotionStatus(
  id: string,
  status: PromotionStatus,
): Promise<Promotion> {
  return request<Promotion>(`/promotions/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function deletePromotion(id: string): Promise<void> {
  return request<void>(`/promotions/${id}`, { method: 'DELETE' });
}
