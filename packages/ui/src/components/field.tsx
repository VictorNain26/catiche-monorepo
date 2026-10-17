import * as React from 'react';
import { Checkbox } from './checkbox';
import { Input } from './input';
import { NativeSelect, NativeSelectOption } from './native-select';

type FieldProps = React.ComponentProps<typeof Input> & { label: string; error?: string | undefined };

/** A labelled input, its error read out with it. */
function Field({ label, error, ...input }: FieldProps) {
  const id = React.useId();
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-bold text-foreground">
        {label}
      </label>
      <Input
        id={id}
        variant={error ? 'error' : 'default'}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...input}
      />
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

type SelectFieldProps = React.ComponentProps<'select'> & { label: string; options: Record<string, string>; error?: string | undefined };

/** A labelled native select, which a phone shows as its own picker. */
function SelectField({ label, options, error, ...select }: SelectFieldProps) {
  const id = React.useId();
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-bold text-foreground">
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
        {Object.entries(options).map(([value, text]) => (
          <NativeSelectOption key={value} value={value}>
            {text}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

type CheckboxFieldProps = Omit<React.ComponentProps<'input'>, 'type'> & { label: string; hint?: string };

/** A checkbox with its label beside it, and a line that says what it means. */
function CheckboxField({ label, hint, ...checkbox }: CheckboxFieldProps) {
  const id = React.useId();
  const hintId = `${id}-hint`;
  return (
    <div className="flex items-start gap-3">
      <Checkbox id={id} aria-describedby={hint ? hintId : undefined} {...checkbox} />
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="text-sm font-bold text-foreground">
          {label}
        </label>
        {hint && (
          <p id={hintId} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

export { CheckboxField, Field, SelectField };
