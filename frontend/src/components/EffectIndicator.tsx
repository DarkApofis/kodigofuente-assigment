import type { PromotionEffect } from '../ui/effect';

const KIND_CLASS: Record<PromotionEffect['kind'], string> = {
  IN_FORCE: 'effect effect-in-force',
  NO_EFFECT: 'effect effect-none',
  NO_EFFECT_ATTENTION: 'effect effect-attention',
};

// Filled bar = applies at the register today; hollow bar = it does not.
// Amber hollow bar flags the case that needs the operator.
export function EffectIndicator({ effect }: { effect: PromotionEffect }) {
  return (
    <span className={KIND_CLASS[effect.kind]}>
      <span className="effect-bar" aria-hidden="true" />
      <span className="effect-text">
        <span className="effect-label">
          {effect.kind === 'IN_FORCE' ? 'Vigente hoy' : 'Sin efecto hoy'}
        </span>
        <span className="effect-note">{effect.note}</span>
      </span>
    </span>
  );
}
