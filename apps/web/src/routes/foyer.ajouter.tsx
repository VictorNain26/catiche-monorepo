import { zodResolver } from '@hookform/resolvers/zod';
import { Banner, Button, CheckboxField, Field, SelectField } from '@repo/ui';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { UserRoundIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm, useWatch, type FieldPath } from 'react-hook-form';
import { BackLink, HeaderLink, Page } from '../components/page';
import {
  CHILD_AGES,
  GUARDIAN_HINT,
  GUARDIAN_LABEL,
  LEVEL_LABELS,
  addStudent,
  birthYears,
  householdMessage,
  newChildSchema,
  studentsQuery,
} from '../lib/household';
import type { z } from '../lib/zod';

/**
 * The adding of a child, one question per screen: their first name, their class, their birth
 * month, then what Tom does, before the memory is proposed. A household without a child opens
 * here; then the child's page, which says the next step.
 */
export const Route = createFileRoute('/foyer/ajouter')({
  // The household's redirect has just read the list: the cache serves it.
  loader: ({ context }) => context.queryClient.query({ ...studentsQuery, staleTime: 'static' }),
  component: AddChild,
});

/** What each step asks, in order: the step is done when they are valid. */
const STEP_FIELDS: FieldPath<z.input<ReturnType<typeof newChildSchema>>>[][] = [
  ['name'],
  ['level'],
  ['month', 'year'],
  ['memoryProposed', 'declaredGuardian'],
];
const STEPS = STEP_FIELDS.length;
const MONTHS: Record<string, string> = Object.fromEntries(
  ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'].map((label, index) => [
    String(index + 1).padStart(2, '0'),
    label,
  ]),
);

function AddChild() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: students } = useSuspenseQuery(studentsQuery);
  const [step, setStep] = useState(1);
  const [schema] = useState(() => newChildSchema());
  const [years] = useState(() => Object.fromEntries(birthYears().map((year) => [year, year])));
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', month: '', year: '', memoryProposed: false, declaredGuardian: false },
  });
  const name = useWatch({ control: form.control, name: 'name' }).trim();

  const create = useMutation({
    mutationFn: addStudent,
    onSuccess: async (created) => {
      queryClient.setQueryData(studentsQuery.queryKey, (list) => [...(list ?? []), created]);
      await navigate({ to: '/foyer/$studentId', params: { studentId: created.id } });
    },
  });

  // Each step opens on its question.
  useEffect(() => {
    const [first] = STEP_FIELDS[step - 1] ?? [];
    if (first) form.setFocus(first);
  }, [step, form]);

  const next = async () => {
    if (await form.trigger(STEP_FIELDS[step - 1])) setStep(step + 1);
  };
  const submit = form.handleSubmit((child) => {
    create.mutate(child);
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
          void next();
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
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-bold text-foreground">Son mois de naissance</legend>
            <div className="flex gap-3">
              <div className="flex-1">
                <SelectField label="Mois" options={MONTHS} {...form.register('month')} error={form.formState.errors.month?.message} />
              </div>
              <div className="flex-1">
                <SelectField label="Année" options={years} {...form.register('year')} error={form.formState.errors.year?.message} />
              </div>
            </div>
          </fieldset>
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
            <CheckboxField
              label={GUARDIAN_LABEL}
              hint={GUARDIAN_HINT}
              {...form.register('declaredGuardian')}
              error={form.formState.errors.declaredGuardian?.message}
            />
            {create.error && (
              <Banner
                tone="error"
                title={householdMessage(create.error, `Vérifiez le prénom et le mois de naissance : votre enfant a ${CHILD_AGES}.`)}
              />
            )}
          </>
        )}
        {step < STEPS ? (
          <Button type="submit">Continuer</Button>
        ) : (
          <Button
            type="button"
            disabled={create.isPending}
            onClick={(event) => {
              // The second click of a double click on « Continuer » lands here: it adds nothing unread.
              if (event.detail <= 1) void submit();
            }}
          >
            Ajouter {name}
          </Button>
        )}
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
