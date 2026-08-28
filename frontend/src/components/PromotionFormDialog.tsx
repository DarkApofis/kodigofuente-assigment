import { useEffect, useRef, useState, type FormEvent } from 'react';
import { errorMessage } from '../api/client';
import { createPromotion, updatePromotion } from '../api/promotions';
import type { Category, DiscountType, Product, Promotion } from '../api/types';

interface Props {
  products: Product[];
  categories: Category[];
  /** When present the dialog edits this promotion instead of creating one */
  promotion?: Promotion;
  onClose: () => void;
  onSaved: () => void;
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

type ErrorKey = 'name' | 'targetId' | 'discountValue' | 'startDate' | 'endDate';
type FormErrors = Partial<Record<ErrorKey, string>>;

// Field metadata for the error summary: label + the input to focus
const ERROR_FIELDS: Record<ErrorKey, { label: string; fieldId: string }> = {
  name: { label: 'Nombre', fieldId: 'promo-name' },
  targetId: { label: 'Objetivo', fieldId: 'promo-product' },
  discountValue: { label: 'Valor del descuento', fieldId: 'promo-value' },
  startDate: { label: 'Fecha de inicio', fieldId: 'promo-start' },
  endDate: { label: 'Fecha de fin', fieldId: 'promo-end' },
};

const INITIAL_VALUES: FormValues = {
  name: '',
  targetKind: 'product',
  targetId: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  startDate: '',
  endDate: '',
};

function valuesFrom(promotion: Promotion): FormValues {
  return {
    name: promotion.name,
    targetKind: promotion.productId ? 'product' : 'category',
    targetId: promotion.productId ?? promotion.categoryId ?? '',
    discountType: promotion.discountType,
    discountValue: String(promotion.discountValue),
    startDate: promotion.startDate,
    endDate: promotion.endDate,
  };
}

// Client-side mirror of the backend rules, for UX only: the server response
// remains the authority and its 400/409 errors are surfaced verbatim.
function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  const name = values.name.trim();

  if (!name) errors.name = 'El nombre es obligatorio.';
  else if (name.length > 120) errors.name = 'Máximo 120 caracteres.';

  if (!values.targetId) {
    errors.targetId =
      values.targetKind === 'product'
        ? 'Selecciona un producto.'
        : 'Selecciona una categoría.';
  }

  const value = Number(values.discountValue);
  if (!values.discountValue || Number.isNaN(value) || value <= 0) {
    errors.discountValue = 'El valor debe ser mayor que 0.';
  } else if (
    values.discountType === 'PERCENTAGE' &&
    (value < 1 || value > 100)
  ) {
    errors.discountValue = 'El porcentaje debe estar entre 1 y 100.';
  }

  if (!values.startDate)
    errors.startDate = 'La fecha de inicio es obligatoria.';
  if (!values.endDate) {
    errors.endDate = 'La fecha de fin es obligatoria.';
  } else if (values.startDate && values.endDate <= values.startDate) {
    errors.endDate = 'La fecha de fin debe ser posterior a la de inicio.';
  }

  return errors;
}

export function PromotionFormDialog({
  products,
  categories,
  promotion,
  onClose,
  onSaved,
}: Props) {
  const editing = Boolean(promotion);
  const [values, setValues] = useState<FormValues>(
    promotion ? valuesFrom(promotion) : INITIAL_VALUES,
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const errorKeys = (Object.keys(errors) as ErrorKey[]).filter(
    (key) => errors[key],
  );
  const valueSuffix = values.discountType === 'PERCENTAGE' ? '%' : '$';

  function setValue<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function switchTargetKind(kind: TargetKind) {
    // Product and category are mutually exclusive: switching clears the pick
    setValues((current) => ({ ...current, targetKind: kind, targetId: '' }));
  }

  function focusField(fieldId: string) {
    document.getElementById(fieldId)?.focus();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setServerError(null);
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      // Move focus to the summary so the errors are announced and visible
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }

    const payload = {
      name: values.name.trim(),
      ...(values.targetKind === 'product'
        ? { productId: values.targetId }
        : { categoryId: values.targetId }),
      discountType: values.discountType,
      discountValue: Number(values.discountValue),
      startDate: values.startDate,
      endDate: values.endDate,
    };

    setSubmitting(true);
    try {
      if (promotion) await updatePromotion(promotion.id, payload);
      else await createPromotion(payload);
      onSaved();
    } catch (error) {
      setServerError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  const productDisabled = values.targetKind !== 'product';
  const categoryDisabled = values.targetKind !== 'category';

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="dialog-header">
          <h2 id="promo-form-title">
            {editing ? 'Editar promoción' : 'Crear promoción'}
          </h2>
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
          <div className="dialog-body">
            {errorKeys.length > 0 && (
              <div
                role="alert"
                className="error-summary"
                ref={summaryRef}
                tabIndex={-1}
              >
                <div className="error-summary-title">
                  No pudimos guardar: revisa{' '}
                  {errorKeys.length === 1
                    ? '1 campo'
                    : `${errorKeys.length} campos`}
                </div>
                <ul>
                  {errorKeys.map((key) => (
                    <li key={key}>
                      <a
                        href={`#${ERROR_FIELDS[key].fieldId}`}
                        onClick={(event) => {
                          event.preventDefault();
                          focusField(ERROR_FIELDS[key].fieldId);
                        }}
                      >
                        {ERROR_FIELDS[key].label}: {errors[key]}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {serverError && (
              <div role="alert" className="error-summary">
                <div className="error-summary-title">{serverError}</div>
              </div>
            )}

            <div className="field">
              <label className="field-label" htmlFor="promo-name">
                Nombre de la promoción
              </label>
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
              <legend className="field-label">Objetivo del descuento</legend>
              <p className="field-hint">Producto o categoría, nunca los dos.</p>
              <div className="segmented" role="radiogroup">
                <label
                  className={
                    values.targetKind === 'product'
                      ? 'seg-option selected'
                      : 'seg-option'
                  }
                >
                  <input
                    type="radio"
                    name="target-kind"
                    checked={values.targetKind === 'product'}
                    onChange={() => switchTargetKind('product')}
                  />
                  Producto
                </label>
                <label
                  className={
                    values.targetKind === 'category'
                      ? 'seg-option selected'
                      : 'seg-option'
                  }
                >
                  <input
                    type="radio"
                    name="target-kind"
                    checked={values.targetKind === 'category'}
                    onChange={() => switchTargetKind('category')}
                  />
                  Categoría
                </label>
              </div>

              <select
                id="promo-product"
                aria-label="Producto"
                disabled={productDisabled}
                value={productDisabled ? '' : values.targetId}
                onChange={(event) => setValue('targetId', event.target.value)}
                aria-invalid={Boolean(errors.targetId) && !productDisabled}
                aria-describedby={
                  errors.targetId && !productDisabled
                    ? 'promo-target-error'
                    : undefined
                }
              >
                {productDisabled ? (
                  <option value="">
                    Producto — no disponible con objetivo Categoría
                  </option>
                ) : (
                  <option value="">Selecciona un producto…</option>
                )}
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>

              <select
                id="promo-category"
                aria-label="Categoría"
                disabled={categoryDisabled}
                value={categoryDisabled ? '' : values.targetId}
                onChange={(event) => setValue('targetId', event.target.value)}
                aria-invalid={Boolean(errors.targetId) && !categoryDisabled}
                aria-describedby={
                  errors.targetId && !categoryDisabled
                    ? 'promo-target-error'
                    : undefined
                }
              >
                {categoryDisabled ? (
                  <option value="">
                    Categoría — no disponible con objetivo Producto
                  </option>
                ) : (
                  <option value="">Selecciona una categoría…</option>
                )}
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.targetId && (
                <p id="promo-target-error" className="field-error">
                  {errors.targetId}
                </p>
              )}
            </fieldset>

            <div className="field-row">
              <fieldset className="field">
                <legend className="field-label">Tipo de descuento</legend>
                <div className="segmented segmented-full" role="radiogroup">
                  <label
                    className={
                      values.discountType === 'PERCENTAGE'
                        ? 'seg-option selected'
                        : 'seg-option'
                    }
                  >
                    <input
                      type="radio"
                      name="discount-type"
                      checked={values.discountType === 'PERCENTAGE'}
                      onChange={() => setValue('discountType', 'PERCENTAGE')}
                    />
                    Porcentaje
                  </label>
                  <label
                    className={
                      values.discountType === 'FIXED_AMOUNT'
                        ? 'seg-option selected'
                        : 'seg-option'
                    }
                  >
                    <input
                      type="radio"
                      name="discount-type"
                      checked={values.discountType === 'FIXED_AMOUNT'}
                      onChange={() => setValue('discountType', 'FIXED_AMOUNT')}
                    />
                    Monto fijo
                  </label>
                </div>
              </fieldset>

              <div className="field">
                <label className="field-label" htmlFor="promo-value">
                  Valor del descuento
                </label>
                <div
                  className={
                    errors.discountValue
                      ? 'input-suffix invalid'
                      : 'input-suffix'
                  }
                >
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
            </div>

            <div className="field-row">
              <div className="field">
                <label className="field-label" htmlFor="promo-start">
                  Fecha de inicio
                </label>
                <input
                  id="promo-start"
                  type="date"
                  value={values.startDate}
                  onChange={(event) =>
                    setValue('startDate', event.target.value)
                  }
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
                <label className="field-label" htmlFor="promo-end">
                  Fecha de fin
                </label>
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

            {!editing && (
              <p className="note-box">
                La promoción se crea en estado <strong>Programada</strong>. No
                tendrá efecto en caja hasta que la actives.
              </p>
            )}
          </div>

          <footer className="dialog-footer">
            <button type="button" className="btn" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting
                ? 'Guardando…'
                : editing
                  ? 'Guardar cambios'
                  : 'Crear promoción'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
