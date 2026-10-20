import { zodResolver } from '@hookform/resolvers/zod';
import { Banner, Button, Field, Fold, SelectField, toast } from '@repo/ui';
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { ChildAccess, useActivation } from '../components/child-access';
import { BackLink, Page } from '../components/page';
import { WeekSummary } from '../components/week-summary';
import { isProblem } from '../lib/api';
import { useConfirmation } from '../lib/confirmation';
import { summaryQuery } from '../lib/summary';
import {
  LEVEL_LABELS,
  deleteStudent,
  householdMessage,
  memoryStatus,
  studentDevicesQuery,
  studentSchema,
  studentsQuery,
  updateStudent,
  type Student,
} from '../lib/household';

/**
 * One child of the household. Until a device holds their profile, the page opens on the next
 * step: a code for their own device, or this computer added. Then their week; their codes and
 * devices side by side on a computer; their memory, their name and class and their account
 * folded, a tap away.
 */
export const Route = createFileRoute('/foyer/$studentId')({
  loader: async ({ context, params }) => {
    // Started, not awaited: the week failing leaves the child's page, which says so.
    void context.queryClient.query(summaryQuery(params.studentId)).catch(() => undefined);
    const students = await context.queryClient.query(studentsQuery);
    if (!students.some(({ id }) => id === params.studentId)) throw redirect({ to: '/foyer' });
    await context.queryClient.query(studentDevicesQuery(params.studentId));
  },
  component: StudentPage,
});

function StudentPage() {
  const { studentId } = Route.useParams();
  const { data: students } = useSuspenseQuery(studentsQuery);
  const week = useQuery(summaryQuery(studentId));
  const child = students.find(({ id }) => id === studentId);
  const activation = useActivation(studentId);
  if (!child) return null;
  const first = activation.devices.length === 0;

  return (
    <Page title={child.name} subtitle={LEVEL_LABELS[child.level]} back={<BackLink to="/foyer">Retour au foyer</BackLink>} wide>
      {first && <ChildAccess child={child} activation={activation} />}
      <WeekSummary week={week.data} failed={week.isError} name={child.name} reader="guardian" />
      {!first && <ChildAccess child={child} activation={activation} />}
      <div className="flex flex-col">
        <Fold title="Ce que Tom retient">
          <Memory child={child} />
        </Fold>
        <Fold title="Son prénom et sa classe">
          <EditStudent child={child} />
        </Fold>
        <Fold title="Supprimer son compte">
          <DeleteStudent child={child} />
        </Fold>
      </div>
    </Page>
  );
}

function Memory({ child }: { child: Student }) {
  const queryClient = useQueryClient();
  const withdrawal = useConfirmation();
  const propose = useMutation({
    mutationFn: (memoryProposed: boolean) => updateStudent(child.id, { memoryProposed }),
    onSuccess: () => {
      withdrawal.close();
      return queryClient.invalidateQueries({ queryKey: studentsQuery.queryKey });
    },
    // Refused, the child may have turned 15 meanwhile: the page reads it again.
    onError: () => queryClient.invalidateQueries({ queryKey: studentsQuery.queryKey }),
  });

  return (
    <>
      <p className="text-muted-foreground">{memoryStatus(child)}</p>
      {propose.error && (
        <Banner
          tone="error"
          title={isProblem(propose.error, 'FORBIDDEN') ? `À partir de 15 ans, c’est ${child.name} qui décide.` : householdMessage(propose.error)}
        />
      )}
      {!child.memory.decidesAlone &&
        (withdrawal.confirming ? (
          <>
            <Banner
              tone="warning"
              focusOnMount
              title={`Tom oubliera ce qu’il retient de ${child.name}, et lui reposera la question si vous la proposez de nouveau.`}
            />
            <Button
              disabled={propose.isPending}
              onClick={() => {
                propose.mutate(false);
              }}
            >
              Retirer et effacer
            </Button>
            <Button variant="outline" onClick={withdrawal.cancel}>
              Annuler
            </Button>
          </>
        ) : (
          <Button
            ref={withdrawal.opener('confirm')}
            variant="outline"
            disabled={propose.isPending}
            onClick={() => {
              if (child.memory.proposed) withdrawal.open('confirm');
              else propose.mutate(true);
            }}
          >
            {child.memory.proposed ? 'Retirer la mémoire' : `Proposer la mémoire à ${child.name}`}
          </Button>
        ))}
    </>
  );
}

function EditStudent({ child }: { child: Student }) {
  const queryClient = useQueryClient();
  const form = useForm({ resolver: zodResolver(studentSchema), defaultValues: { name: child.name, level: child.level } });
  const update = useMutation({
    mutationFn: (json: Parameters<typeof updateStudent>[1]) => updateStudent(child.id, json),
    onSuccess: () => {
      toast('Enregistré.');
      return queryClient.invalidateQueries({ queryKey: studentsQuery.queryKey });
    },
  });
  const submit = form.handleSubmit((values) => {
    update.mutate(values);
  });

  return (
    <form
      noValidate
      onSubmit={(event) => void submit(event)}
      // A change after a failed save is a new attempt: the error of the last one goes.
      onChange={() => {
        update.reset();
      }}
      className="flex flex-col gap-4"
    >
      <Field label="Son prénom" autoComplete="off" {...form.register('name')} error={form.formState.errors.name?.message} />
      <SelectField label="Sa classe" options={LEVEL_LABELS} {...form.register('level')} error={form.formState.errors.level?.message} />
      {update.error && <Banner tone="error" title={householdMessage(update.error)} />}
      <Button type="submit" variant="outline" disabled={update.isPending}>
        Enregistrer
      </Button>
    </form>
  );
}

function DeleteStudent({ child }: { child: Student }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const deletion = useConfirmation();
  const remove = useMutation({
    mutationFn: () => deleteStudent(child.id),
    onSuccess: async () => {
      await navigate({ to: '/foyer' });
      await queryClient.invalidateQueries({ queryKey: studentsQuery.queryKey });
    },
  });

  return deletion.confirming ? (
    <>
      <Banner tone="warning" focusOnMount title="Ses séances seront effacées et ses appareils déconnectés. C’est définitif." />
      {remove.error && <Banner tone="error" title={householdMessage(remove.error)} />}
      <Button
        disabled={remove.isPending}
        onClick={() => {
          remove.mutate();
        }}
      >
        Supprimer définitivement
      </Button>
      <Button variant="outline" onClick={deletion.cancel}>
        Annuler
      </Button>
    </>
  ) : (
    <Button
      ref={deletion.opener('confirm')}
      variant="outline"
      onClick={() => {
        deletion.open('confirm');
      }}
    >
      Supprimer le compte de {child.name}
    </Button>
  );
}
