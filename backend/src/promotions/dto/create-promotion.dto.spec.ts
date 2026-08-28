import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePromotionDto } from './create-promotion.dto';

const PRODUCT_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const CATEGORY_ID = '9b2b7a1e-6c3d-4e5f-8a90-1b2c3d4e5f60';

const validPayload = {
  name: '10% off drinks',
  productId: PRODUCT_ID,
  discountType: 'PERCENTAGE',
  discountValue: 10,
  startDate: '2026-09-01',
  endDate: '2026-09-30',
};

async function messagesFor(
  overrides: Record<string, unknown>,
  removals: string[] = [],
): Promise<string[]> {
  const payload: Record<string, unknown> = { ...validPayload, ...overrides };
  for (const field of removals) {
    delete payload[field];
  }
  const errors = await validate(plainToInstance(CreatePromotionDto, payload));
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('CreatePromotionDto', () => {
  it('accepts a well-formed promotion', async () => {
    expect(await messagesFor({})).toEqual([]);
  });

  describe('percentage discounts must stay between 1 and 100', () => {
    it('rejects a 0% discount', async () => {
      expect(await messagesFor({ discountValue: 0 })).not.toEqual([]);
    });

    it('accepts a 1% discount (lower bound)', async () => {
      expect(await messagesFor({ discountValue: 1 })).toEqual([]);
    });

    it('accepts a 100% discount (upper bound)', async () => {
      expect(await messagesFor({ discountValue: 100 })).toEqual([]);
    });

    it('rejects a 101% discount', async () => {
      const messages = await messagesFor({ discountValue: 101 });
      expect(messages.join(' ')).toContain('between 1 and 100');
    });

    it('the range only applies to percentages: a fixed amount of 150 is fine', async () => {
      expect(
        await messagesFor({ discountType: 'FIXED_AMOUNT', discountValue: 150 }),
      ).toEqual([]);
    });
  });

  describe('date range', () => {
    it('rejects endDate equal to startDate (a promotion must span more than a day boundary)', async () => {
      const messages = await messagesFor({
        startDate: '2026-09-01',
        endDate: '2026-09-01',
      });
      expect(messages.join(' ')).toContain('endDate must be strictly after');
    });

    it('rejects endDate before startDate', async () => {
      const messages = await messagesFor({
        startDate: '2026-09-30',
        endDate: '2026-09-01',
      });
      expect(messages.join(' ')).toContain('endDate must be strictly after');
    });

    it('rejects dates that are not plain YYYY-MM-DD', async () => {
      const messages = await messagesFor({
        startDate: '2026-09-01T00:00:00Z',
      });
      expect(messages.join(' ')).toContain('YYYY-MM-DD');
    });
  });

  describe('a promotion targets exactly one product or one category', () => {
    it('rejects a promotion with both product and category', async () => {
      const messages = await messagesFor({ categoryId: CATEGORY_ID });
      expect(messages.join(' ')).toContain('not both');
    });

    it('rejects a promotion with neither product nor category', async () => {
      const messages = await messagesFor({}, ['productId']);
      expect(messages.join(' ')).toContain(
        'exactly one of productId or categoryId',
      );
    });

    it('accepts a category-targeted promotion', async () => {
      expect(
        await messagesFor({ categoryId: CATEGORY_ID }, ['productId']),
      ).toEqual([]);
    });
  });

  it('rejects an empty name', async () => {
    expect(await messagesFor({ name: '' })).not.toEqual([]);
  });

  it('rejects a name longer than 120 characters', async () => {
    expect(await messagesFor({ name: 'x'.repeat(121) })).not.toEqual([]);
  });
});
