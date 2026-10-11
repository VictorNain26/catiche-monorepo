import { zodResolver } from '@hookform/resolvers/zod';
import { Button, NativeSelect, NativeSelectOption } from '@repo/ui';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { UserRoundIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { z } from '../lib/zod';
import { CheckboxField, Field, SelectField } from '../components/field';
import { Notice } from '../components/notice';
import { BackLink, HeaderLink, Page } from '../components/page';
import { api, parseResponse } from '../lib/api';
import { LEVEL_LABELS, householdMessage, newStudentSchema, studentsQuery } from '../lib/household';

/**
 * The adding of a child, one question per screen: their first name, their class, their birth
 * month, then what Tom does, before the memory is proposed. A household without a child opens
 * here; then the child's page, which says the next step.
 */
export const Route = createFileRoute('/foyer/ajouter')({
  loader: ({ context }) => context.queryClient.query(studentsQuery),
  component: AddChild,
});

const STEPS = 4;
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

/** The years of a child from 5 to 20, the ages the server accepts, the youngest last. */
const birthYears = (now = new Date()) => Array.from({ length: 16 }, (_, index) => String(now.getFullYear() - 20 + index));

function AddChild() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: students } = useSuspenseQuery(studentsQuery);
  const [step, setStep] = useState(1);
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const monthRef = useRef<HTMLSelectElement>(null);
  const form = useForm({ resolver: zodResolver(newStudentSchema), defaultValues: { name: '', birthMonth: '', memoryProposed: false } });
  const name = useWatch({ control: form.control, name: 'name' }).trim();

  const create = useMutation({
    mutationFn: (json: z.output<typeof newStudentSchema>) => parseResponse(api.household.students.$post({ json })),
    onSuccess: async (created) => {
      queryClient.setQueryData(studentsQuery.queryKey, (list) => [...(list ?? []), created]);
      await navigate({ to: '/foyer/$studentId', params: { studentId: created.id } });
    },
  });

  // Each step opens on its question.
  useEffect(() => {
    if (step === 1) form.setFocus('name');
    else if (step === 2) form.setFocus('level');
    else if (step === 3) monthRef.current?.focus();
    else form.setFocus('memoryProposed');
  }, [step, form]);

  const next = async () => {
    if (step === 3) {
      if (month === '' || year === '') {
        form.setError('birthMonth', { message: 'Son mois et son année de naissance.' });
        return;
      }
      form.setValue('birthMonth', `${year}-${month}`);
    }
    const field = step === 1 ? 'name' : step === 2 ? 'level' : 'birthMonth';
    if (await form.trigger(field)) setStep(step + 1);
  };
  const submit = form.handleSubmit((values) => {
    create.mutate(values);
  });

  return (
    <Page
      title="Ajouter un enfant"
      back={students.length > 0 ? <BackLink to="/foyer">Retour au foyer</BackLink> : undefined}
      action={
        students.length === 0 ? (
          <HeaderLink to="/foyer/compte" icon={UserRoundIcon}>
            Mon compte
          </HeaderLink>
        ) : undefined
      }
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (step < STEPS) void next();
          else void submit(event);
        }}
        className="flex flex-col gap-4"
      >
        <p className="font-mono text-sm text-muted-foreground">
          Étape {step} sur {STEPS}
        </p>
        {step === 1 && <Field label="Son prénom" autoComplete="off" {...form.register('name')} error={form.formState.errors.name?.message} />}
        {step === 2 && (
          <SelectField label="Sa classe" options={LEVEL_LABELS} {...form.register('level')} error={form.formState.errors.level?.message} />
        )}
        {step === 3 && (
          <BirthMonth
            month={month}
            year={year}
            monthRef={monthRef}
            error={form.formState.errors.birthMonth?.message}
            onMonth={setMonth}
            onYear={setYear}
          />
        )}
        {step === 4 && (
          <>
            <p className="text-foreground">
              Tom pose des questions à {name}, une à la fois : c’est à {name} de trouver la réponse. Chaque semaine, vous voyez ce qui a été
              travaillé, jamais les conversations.
            </p>
            <CheckboxField
              label="Proposer que Tom retienne ce qui a résisté"
              hint={`Les notions de ses exercices et ce qui a été difficile, jamais ce qui est écrit dans les séances. ${name} accepte ou non, et peut tout effacer.`}
              {...form.register('memoryProposed')}
            />
            {create.error && (
              <Notice tone="error">
                {householdMessage(create.error, 'Vérifiez le prénom et le mois de naissance : votre enfant a entre 5 et 20 ans.')}
              </Notice>
            )}
          </>
        )}
        <Button type="submit" disabled={create.isPending}>
          {step < STEPS ? 'Continuer' : `Ajouter ${name}`}
        </Button>
        {step > 1 && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setStep(step - 1);
            }}
          >
            Précédent
          </Button>
        )}
      </form>
    </Page>
  );
}

interface BirthMonthProps {
  month: string;
  year: string;
  monthRef: RefObject<HTMLSelectElement | null>;
  error: string | undefined;
  onMonth: (month: string) => void;
  onYear: (year: string) => void;
}

/** The birth month in two plain menus, which every browser shows filled in, unlike a month field. */
function BirthMonth({ month, year, monthRef, error, onMonth, onYear }: BirthMonthProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const described = error ? errorId : undefined;
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={described}>
      <legend className="text-sm font-bold text-foreground">Son mois de naissance</legend>
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm text-muted-foreground">
          Mois
          <NativeSelect
            ref={monthRef}
            value={month}
            variant={error ? 'error' : 'default'}
            onChange={(event) => {
              onMonth(event.target.value);
            }}
          >
            <NativeSelectOption value="">Choisir</NativeSelectOption>
            {MONTHS.map((label, index) => (
              <NativeSelectOption key={label} value={String(index + 1).padStart(2, '0')}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm text-muted-foreground">
          Année
          <NativeSelect
            value={year}
            variant={error ? 'error' : 'default'}
            onChange={(event) => {
              onYear(event.target.value);
            }}
          >
            <NativeSelectOption value="">Choisir</NativeSelectOption>
            {birthYears().map((option) => (
              <NativeSelectOption key={option} value={option}>
                {option}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
      </div>
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
