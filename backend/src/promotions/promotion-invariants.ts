import { DiscountType } from './promotion.enums';

// Cross-field business invariants, mirrored by the DB CHECK constraints.
// Pure and framework-free so both the DTO validator (create) and the service
// (update, after merging with the stored promotion) share one implementation.

export interface PromotionInvariantInput {
  productId?: string | null;
  categoryId?: string | null;
  discountType?: DiscountType;
  discountValue?: number;
  startDate?: string;
  endDate?: string;
}

export interface InvariantOptions {
  // true when the input must carry a target (create / merged update);
  // false for partial payloads where absent fields mean "keep current value"
  requireTarget?: boolean;
}

export function getInvariantViolations(
  input: PromotionInvariantInput,
  options: InvariantOptions = {},
): string[] {
  const violations: string[] = [];
  const hasProduct = input.productId != null;
  const hasCategory = input.categoryId != null;

  if (hasProduct && hasCategory) {
    violations.push(
      'exactly one of productId or categoryId must be provided, not both',
    );
  }
  if (options.requireTarget && !hasProduct && !hasCategory) {
    violations.push('exactly one of productId or categoryId must be provided');
  }

  if (input.startDate && input.endDate && input.endDate <= input.startDate) {
    violations.push('endDate must be strictly after startDate');
  }

  if (
    input.discountType === DiscountType.PERCENTAGE &&
    input.discountValue !== undefined &&
    (input.discountValue < 1 || input.discountValue > 100)
  ) {
    violations.push(
      'discountValue must be between 1 and 100 when discountType is PERCENTAGE',
    );
  }

  return violations;
}
