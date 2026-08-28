import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import {
  getInvariantViolations,
  InvariantOptions,
  PromotionInvariantInput,
} from '../promotion-invariants';

// Class-level validator for cross-field rules that no single-property
// decorator can express (target XOR, date ordering, percentage range).
// Registered under a synthetic property name so violations surface as one
// aggregated message in the standard ValidationPipe response.
export function HasValidPromotionInvariants(
  invariantOptions: InvariantOptions,
  validationOptions?: ValidationOptions,
): ClassDecorator {
  return (target) => {
    registerDecorator({
      name: 'hasValidPromotionInvariants',
      target: target as unknown as new (...args: unknown[]) => unknown,
      propertyName: 'promotionInvariants',
      options: validationOptions,
      validator: {
        validate(_value: unknown, args: ValidationArguments): boolean {
          const input = args.object as PromotionInvariantInput;
          return getInvariantViolations(input, invariantOptions).length === 0;
        },
        defaultMessage(args: ValidationArguments): string {
          const input = args.object as PromotionInvariantInput;
          return getInvariantViolations(input, invariantOptions).join('; ');
        },
      },
    });
  };
}
