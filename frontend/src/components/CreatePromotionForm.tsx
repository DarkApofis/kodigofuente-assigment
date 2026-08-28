import { useState, type FormEvent } from 'react';
import { errorMessage } from '../api/client';
import { createPromotion } from '../api/promotions';
import type { Category, DiscountType, Product } from '../api/types';

interface Props {
  products: Product[];
  categories: Category[];
  onClose: () => void;
  onCreated: () => void;
}

type TargetKind = 'product' | 'category';

interface FormValues {
  name: string;
  targetKind: TargetKind;
  targetId: string;
  discountType: DiscountType;
  discountValue: string;
  startDate: string;
  endDate: string;
}

type FormErrors = Partial<Record<keyof FormValues, string>>;

const INITIAL_VALUES: FormValues = {
  name: '',
  targetKind: 'product',
  targetId: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  startDate: '',
  endDate: '',
};

// Client-side mirror of the backend rules, for UX only: the server response
// remains the authority and its 400/409 errors are surfaced verbatim.
function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  const name = values.name.trim();

  if (!name) errors.name = 'El nombre es obligatorio';
  else if (name.length > 120) errors.name = 'Máximo 120 caracteres';

  if (!values.targetId) {
    errors.targetId =
      values.targetKind === 'product'
        ? 'Selecciona un producto'
        : 'Selecciona una categoría';
  }

  const value = Number(values.discountValue);
  if (!values.discountValue || Number.isNaN(value) || value <= 0) {
    errors.discountValue = 'El valor debe ser mayor que 0';
  } else if (
    values.discountType === 'PERCENTAGE' &&
    (value < 1 || value > 100)
  ) {
    errors.discountValue = 'El porcentaje debe estar entre 1 y 100';
  }

  if (!values.startDate) errors.startDate = 'La fecha de inicio es obligatoria';
  if (!values.endDate) {
    errors.endDate = 'La fecha de fin es obligatoria';
  } else if (values.startDate && values.endDate <= values.startDate) {
    errors.endDate = 'La fecha de fin debe ser posterior a la de inicio';
  }

  return errors;
}

export function CreatePromotionForm({
  products,
  categories,
  onClose,
  onCreated,
}: Props) {
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const targetOptions = values.targetKind === 'product' ? products : categories;
  const targetLabel =
    values.targetKind === 'product' ? 'Producto' : 'Categoría';
  const valueSuffix = values.discountType === 'PERCENTAGE' ? '%' : '$';

  function setValue<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function switchTargetKind(kind: TargetKind) {
    // Product and category are mutually exclusive: switching clears the pick
    setValues((current) => ({ ...current, targetKind: kind, targetId: '' }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setServerError(null);
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await createPromotion({
        name: values.name.trim(),
        ...(values.targetKind === 'product'
          ? { productId: values.targetId }
          : { categoryId: values.targetId }),
        discountType: values.discountType,
        discountValue: Number(values.discountValue),
        startDate: values.startDate,
        endDate: values.endDate,
      });
      onCreated();
    } catch (error) {
      setServerError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <aside
        className="panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-promo-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="panel-header">
          <h2 id="create-promo-title">Nueva promoción</h2>
          <button
            type="button"
            className="btn btn-icon"
            onClick={onClose}
            aria-label="Cerrar el formulario"
          >
            ✕
          </button>
        </header>

        <form onSubmit={(event) => void handleSubmit(event)} noValidate>
          <div className="field">
            <label htmlFor="promo-name">Nombre</label>
            <input
              id="promo-name"
              type="text"
              value={values.name}
              onChange={(event) => setValue('name', event.target.value)}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'promo-name-error' : undefined}
            />
            {errors.name && (
              <p id="promo-name-error" className="field-error">
                {errors.name}
              </p>
            )}
          </div>

          <fieldset className="field">
            <legend>Objetivo de la promoción</legend>
            <div className="radio-row">
              <label>
                <input
                  type="radio"
                  name="target-kind"
                  checked={values.targetKind === 'product'}
                  onChange={() => switchTargetKind('product')}
                />
                Por producto
              </label>
              <label>
                <input
                  type="radio"
                  name="target-kind"
                  checked={values.targetKind === 'category'}
                  onChange={() => switchTargetKind('category')}
                />
                Por categoría
              </label>
            </div>
            <label htmlFor="promo-target">{targetLabel}</label>
            <select
              id="promo-target"
              value={values.targetId}
              onChange={(event) => setValue('targetId', event.target.value)}
              aria-invalid={Boolean(errors.targetId)}
              aria-describedby={
                errors.targetId ? 'promo-target-error' : undefined
              }
            >
              <option value="">Selecciona…</option>
              {targetOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
            {errors.targetId && (
              <p id="promo-target-error" className="field-error">
                {errors.targetId}
              </p>
            )}
          </fieldset>

          <div className="field">
            <label htmlFor="promo-discount-type">Tipo de descuento</label>
            <select
              id="promo-discount-type"
              value={values.discountType}
              onChange={(event) =>
                setValue('discountType', event.target.value as DiscountType)
              }
            >
              <option value="PERCENTAGE">Porcentaje</option>
              <option value="FIXED_AMOUNT">Monto fijo</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="promo-value">Valor del descuento</label>
            <div className="input-suffix">
              <input
                id="promo-value"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={values.discountValue}
                onChange={(event) =>
                  setValue('discountValue', event.target.value)
                }
                aria-invalid={Boolean(errors.discountValue)}
                aria-describedby={
                  errors.discountValue ? 'promo-value-error' : undefined
                }
              />
              <span className="suffix" aria-hidden="true">
                {valueSuffix}
              </span>
            </div>
            {errors.discountValue && (
              <p id="promo-value-error" className="field-error">
                {errors.discountValue}
              </p>
            )}
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="promo-start">Fecha de inicio</label>
              <input
                id="promo-start"
                type="date"
                value={values.startDate}
                onChange={(event) => setValue('startDate', event.target.value)}
                aria-invalid={Boolean(errors.startDate)}
                aria-describedby={
                  errors.startDate ? 'promo-start-error' : undefined
                }
              />
              {errors.startDate && (
                <p id="promo-start-error" className="field-error">
                  {errors.startDate}
                </p>
              )}
            </div>
            <div className="field">
              <label htmlFor="promo-end">Fecha de fin</label>
              <input
                id="promo-end"
                type="date"
                value={values.endDate}
                onChange={(event) => setValue('endDate', event.target.value)}
                aria-invalid={Boolean(errors.endDate)}
                aria-describedby={
                  errors.endDate ? 'promo-end-error' : undefined
                }
              />
              {errors.endDate && (
                <p id="promo-end-error" className="field-error">
                  {errors.endDate}
                </p>
              )}
            </div>
          </div>

          {serverError && (
            <p role="alert" className="form-error">
              {serverError}
            </p>
          )}

          <footer className="panel-footer">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Creando…' : 'Crear promoción'}
            </button>
            <button type="button" className="btn" onClick={onClose}>
              Cancelar
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
