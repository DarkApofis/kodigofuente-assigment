import { DiscountType } from './promotion.enums';
import { getInvariantViolations } from './promotion-invariants';

const PRODUCT_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const CATEGORY_ID = '9b2b7a1e-6c3d-4e5f-8a90-1b2c3d4e5f60';

describe('promotion invariants (pure)', () => {
  describe('target XOR', () => {
    it('a promotion cannot target a product and a category at once', () => {
      const violations = getInvariantViolations({
        productId: PRODUCT_ID,
        categoryId: CATEGORY_ID,
      });
      expect(violations.join(' ')).toContain('not both');
    });

    it('a full payload without any target is rejected', () => {
      const violations = getInvariantViolations(
        { productId: null, categoryId: null },
        { requireTarget: true },
      );
      expect(violations.join(' ')).toContain(
        'exactly one of productId or categoryId',
      );
    });

    it('a partial payload without target is fine: it keeps the stored one', () => {
      expect(getInvariantViolations({}, { requireTarget: false })).toEqual([]);
    });
  });

  describe('date range', () => {
    it('endDate equal to startDate is a violation', () => {
      const violations = getInvariantViolations({
        productId: PRODUCT_ID,
        startDate: '2026-09-01',
        endDate: '2026-09-01',
      });
      expect(violations.join(' ')).toContain('strictly after');
    });

    it('a single date without its pair cannot be judged and passes', () => {
      expect(
        getInvariantViolations({
          productId: PRODUCT_ID,
          endDate: '2026-09-01',
        }),
      ).toEqual([]);
    });
  });

  describe('percentage range', () => {
    it('a percentage above 100 is a violation', () => {
      const violations = getInvariantViolations({
        productId: PRODUCT_ID,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 101,
      });
      expect(violations.join(' ')).toContain('between 1 and 100');
    });

    it('a percentage below 1 is a violation', () => {
      const violations = getInvariantViolations({
        productId: PRODUCT_ID,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 0.5,
      });
      expect(violations.join(' ')).toContain('between 1 and 100');
    });

    it('a percentage type without a value cannot be judged and passes', () => {
      expect(
        getInvariantViolations({
          productId: PRODUCT_ID,
          discountType: DiscountType.PERCENTAGE,
        }),
      ).toEqual([]);
    });

    it('the range does not apply to fixed amounts', () => {
      expect(
        getInvariantViolations({
          productId: PRODUCT_ID,
          discountType: DiscountType.FIXED_AMOUNT,
          discountValue: 5000,
        }),
      ).toEqual([]);
    });
  });

  it('a fully valid input produces no violations', () => {
    expect(
      getInvariantViolations(
        {
          productId: PRODUCT_ID,
          categoryId: null,
          discountType: DiscountType.PERCENTAGE,
          discountValue: 10,
          startDate: '2026-09-01',
          endDate: '2026-09-30',
        },
        { requireTarget: true },
      ),
    ).toEqual([]);
  });
});
