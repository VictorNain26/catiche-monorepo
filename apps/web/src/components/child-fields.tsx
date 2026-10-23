import { CheckboxField, Field, SelectField } from '@repo/ui';
import { useState } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { GUARDIAN_HINT, GUARDIAN_LABEL, LEVEL_LABELS, birthYears } from '../lib/household';

type ChildField = 'name' | 'level' | 'month' | 'year' | 'declaredGuardian';

const MONTHS: Record<string, string> = Object.fromEntries(
  ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'].map((label, index) => [
    String(index + 1).padStart(2, '0'),
    label,
  ]),
);

/**
 * What adding a child asks, on one screen (`newChildSchema`): their first name, their class, their
 * month and year of birth, and the declaration of parental authority. The adult's first screen
 * asks it under « Votre enfant », the adding of the next child alone.
 */
export function ChildFields({
  register,
  errors,
}: {
  register: (field: ChildField) => UseFormRegisterReturn;
  /** The form's errors for these fields, as react-hook-form gives them. */
  errors: Partial<Record<ChildField, { message?: string | undefined }>> | undefined;
}) {
  const [years] = useState(() => Object.fromEntries(birthYears().map((year) => [year, year])));
  return (
    <>
      <Field label="Son prénom" autoComplete="off" {...register('name')} error={errors?.name?.message} />
      <SelectField label="Sa classe" options={LEVEL_LABELS} {...register('level')} error={errors?.level?.message} />
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-bold text-foreground">Son mois de naissance</legend>
        <div className="flex gap-3">
          <div className="flex-1">
            <SelectField label="Mois" options={MONTHS} {...register('month')} error={errors?.month?.message} />
          </div>
          <div className="flex-1">
            <SelectField label="Année" options={years} {...register('year')} error={errors?.year?.message} />
          </div>
        </div>
      </fieldset>
      <CheckboxField label={GUARDIAN_LABEL} hint={GUARDIAN_HINT} {...register('declaredGuardian')} error={errors?.declaredGuardian?.message} />
    </>
  );
}
