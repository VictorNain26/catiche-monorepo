import * as React from 'react';
import { Checkbox } from './checkbox';
import { Input } from './input';
import { NativeSelect, NativeSelectOption } from './native-select';

type FieldProps = React.ComponentProps<typeof Input> & { label: string; hint?: string; error?: string | undefined };

/** A labelled input, what it is for under its label, its error read out with it. */
function Field({ label, hint, error, ...input }: FieldProps) {
  const id = React.useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ');
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-meta font-bold text-foreground">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-meta text-muted-foreground">
          {hint}
        </p>
      )}
      <Input
        id={id}
        variant={error ? 'error' : 'default'}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...input}
      />
      {error && (
        <p id={errorId} className="text-meta text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** `options`: each value with its label, in the order the menu lists them. */
type SelectFieldProps = React.ComponentProps<'select'> & {
  label: string;
  options: readonly (readonly [value: string, label: string])[];
  error?: string | undefined;
};

/** A labelled native select, which a phone shows as its own picker. */
function SelectField({ label, options, error, ...select }: SelectFieldProps) {
  const id = React.useId();
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-meta font-bold text-foreground">
        {label}
      </label>
      <NativeSelect
        id={id}
        variant={error ? 'error' : 'default'}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...select}
      >
        <NativeSelectOption value="">Choisir</NativeSelectOption>
        {options.map(([value, text]) => (
          <NativeSelectOption key={value} value={value}>
            {text}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {error && (
        <p id={errorId} className="text-meta text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

type CheckboxFieldProps = Omit<React.ComponentProps<'input'>, 'type'> & { label: string; hint?: string; error?: string | undefined };

/**
 * A checkbox with its label beside it, a line that says what it means, and its error read out with it.
 * The label wraps the box: the whole row, 44 px high at least, ticks it.
 */
function CheckboxField({ label, hint, error, ...checkbox }: CheckboxFieldProps) {
  const id = React.useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ');
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 text-meta font-bold text-foreground">
        <Checkbox id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy || undefined} {...checkbox} />
        {label}
      </label>
      {hint && (
        <p id={hintId} className="pl-9 text-meta text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="pl-9 text-meta text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export { CheckboxField, Field, SelectField };
