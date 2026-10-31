/**
 * Small shared UI pieces.
 *
 * Deliberately plain: one button, one card, one field. The look comes from the
 * tokens in index.css, so a change there moves the whole app at once.
 */

import {
  forwardRef,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { Link, type LinkProps } from 'react-router-dom';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white shadow-petal hover:brightness-110 active:brightness-95',
  secondary:
    'bg-surface text-ink border border-line-strong hover:border-accent hover:text-accent-ink',
  ghost: 'text-ink-soft hover:text-ink hover:bg-sunk',
  danger:
    'bg-surface text-ink-soft border border-line hover:text-accent-ink hover:border-accent',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3.5 py-2 text-sm',
  md: 'px-5 py-2.5 text-[0.95rem]',
  lg: 'px-7 py-3.5 text-base',
};

function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  extra = '',
): string {
  return [
    'inline-flex items-center justify-center gap-2 rounded-pill font-semibold',
    'transition-[filter,background-color,border-color,color,transform] duration-200',
    'disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none',
    'motion-safe:active:scale-[0.98]',
    VARIANTS[variant],
    SIZES[size],
    extra,
  ].join(' ');
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className = '', type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses(variant, size, className)}
      {...rest}
    />
  );
});

export interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className = '',
  ...rest
}: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...rest} />;
}

export function Card({
  children,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li';
}) {
  return (
    <Tag className={`rounded-card border border-line bg-surface shadow-petal ${className}`}>
      {children}
    </Tag>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-bold tracking-[0.18em] text-ink-faint uppercase">{children}</p>
  );
}

/** A small decorative sprig used to break up sections. */
export function Divider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`} aria-hidden="true">
      <span className="h-px w-16 bg-line-strong" />
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-accent" fill="currentColor">
        <circle cx="12" cy="6" r="3.2" />
        <circle cx="6" cy="15" r="3.2" opacity="0.72" />
        <circle cx="18" cy="15" r="3.2" opacity="0.72" />
      </svg>
      <span className="h-px w-16 bg-line-strong" />
    </div>
  );
}

// --------------------------------------------------------------------------
// form fields
// --------------------------------------------------------------------------

const FIELD_CLASSES =
  'w-full rounded-2xl border border-line-strong bg-page px-4 py-3 text-ink ' +
  'placeholder:text-ink-faint transition-colors focus:border-accent focus:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-accent/40';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  hint?: string;
  /** Shows "n / max" under the field. */
  counter?: { value: number; max: number };
}

export function TextField({ label, hint, counter, className = '', ...rest }: TextFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      <input id={id} className={FIELD_CLASSES} aria-describedby={hintId} {...rest} />
      <FieldFooter hintId={hintId} hint={hint} counter={counter} />
    </div>
  );
}

export interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label: string;
  hint?: string;
  counter?: { value: number; max: number };
}

export function TextArea({ label, hint, counter, className = '', ...rest }: TextAreaProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      <textarea
        id={id}
        className={`${FIELD_CLASSES} min-h-32 resize-y leading-relaxed`}
        aria-describedby={hintId}
        {...rest}
      />
      <FieldFooter hintId={hintId} hint={hint} counter={counter} />
    </div>
  );
}

function FieldFooter({
  hintId,
  hint,
  counter,
}: {
  hintId?: string;
  hint?: string;
  counter?: { value: number; max: number };
}) {
  if (!hint && !counter) return null;
  const nearLimit = counter ? counter.value > counter.max * 0.9 : false;

  return (
    <div className="mt-1.5 flex items-baseline justify-between gap-3">
      <p id={hintId} className="text-xs text-ink-faint">
        {hint}
      </p>
      {counter && (
        <p
          className={`shrink-0 text-xs tabular-nums ${
            nearLimit ? 'font-semibold text-accent-ink' : 'text-ink-faint'
          }`}
          aria-live="polite"
        >
          {counter.value} / {counter.max}
        </p>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// choices
// --------------------------------------------------------------------------

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  swatch?: string;
}

/**
 * A labelled group of mutually exclusive options, built from real radio
 * inputs so arrow keys and screen readers behave as expected.
 */
export function ChoiceGroup<T extends string>({
  legend,
  options,
  value,
  onChange,
  columns = 2,
}: {
  legend: string;
  options: readonly ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
  columns?: 2 | 3 | 4;
}) {
  const name = useId();
  const gridClass = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-2 sm:grid-cols-4' }[
    columns
  ];

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-ink">{legend}</legend>
      <div className={`grid gap-2 ${gridClass}`}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                selected
                  ? 'border-accent bg-accent-wash text-ink'
                  : 'border-line bg-surface text-ink-soft hover:border-line-strong'
              } focus-within:ring-2 focus-within:ring-accent/40`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.swatch && (
                <span
                  className="h-5 w-5 shrink-0 rounded-full border border-black/10 shadow-inner"
                  style={{ backgroundColor: option.swatch }}
                  aria-hidden="true"
                />
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{option.label}</span>
                {option.description && (
                  <span className="block truncate text-xs text-ink-faint">
                    {option.description}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** A row of colour swatches. */
export function SwatchPicker({
  legend,
  colors,
  value,
  onChange,
}: {
  legend: string;
  colors: readonly { name: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => {
          const selected = color.value.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={color.value}
              type="button"
              onClick={() => onChange(color.value)}
              aria-pressed={selected}
              aria-label={color.name}
              title={color.name}
              className={`h-9 w-9 rounded-full border-2 transition-transform motion-safe:hover:scale-110 ${
                selected ? 'border-accent ring-2 ring-accent/35' : 'border-line-strong'
              }`}
              style={{ backgroundColor: color.value }}
            />
          );
        })}
      </div>
    </fieldset>
  );
}

/** Inline status message. */
export function Notice({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'error' | 'success';
  children: ReactNode;
}) {
  const tones = {
    info: 'border-line-strong bg-sunk text-ink-soft',
    error: 'border-accent/40 bg-accent-wash text-accent-ink',
    success: 'border-sage-300 bg-sage-100 text-sage-600',
  } as const;

  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-2xl border px-4 py-3 text-sm ${tones[tone]}`}
    >
      {children}
    </p>
  );
}

export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>;
}
