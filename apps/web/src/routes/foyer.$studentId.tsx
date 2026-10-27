import { zodResolver } from '@hookform/resolvers/zod';
import { Banner, Button, Field, Fold, List, ListItem, Section, SelectField, toast } from '@repo/ui';
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Link, createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { ChildDevices, ForgottenCode, useActivation } from '../components/child-access';
import { DeleteStudent, DeletionAsked } from '../components/child-deletion';
import { ChildHistory } from '../components/child-history';
import { AdultPage } from '../components/page';
import { WeekSummary } from '../components/week-summary';
import { isProblem } from '../lib/api';
import { useConfirmation } from '../lib/confirmation';
import { formatDay } from '../lib/device';
import { historyQuery } from '../lib/history';
import { meQuery } from '../lib/me';
import { capitalised } from '../lib/words';
import { summaryQuery } from '../lib/summary';
import {
  LEVEL_LABELS,
  LEVEL_OPTIONS,
  ROLE_LABELS,
  adultsQuery,
  askParents,
  decidesWith,
  householdMessage,
  memoryStatus,
  removeAdult,
  studentDevicesQuery,
  studentSchema,
  studentsQuery,
  updateStudent,
  withdrawInvitation,
  type Student,
} from '../lib/household';

/**
 * « Gérer [prénom] » (A7). For a parent: who decides with them; until a device holds the child's
 * profile, the page opens on their devices, with the way to add one (A4); then their week; their
 * devices; their forgotten code; their adults; and, folded under « Plus », their memory, their name
 * and class, the history and their account, whose deletion asked shows at the top. Two columns on a computer. For a relative: the week,
 * whom to ask for a device, and their way out.
 */
export const Route = createFileRoute('/foyer/$studentId')({
  loader: async ({ context, params }) => {
    // Started, not awaited: the week failing leaves the child's page, which says so.
    void context.queryClient.query(summaryQuery(params.studentId)).catch(() => undefined);
    const students = await context.queryClient.query(studentsQuery);
    const child = students.find(({ id }) => id === params.studentId);
    if (!child) throw redirect({ to: '/foyer' });
    if (child.role === 'guardian') {
      await Promise.all([context.queryClient.query(studentDevicesQuery(params.studentId)), context.queryClient.query(adultsQuery(params.studentId))]);
    }
  },
  component: StudentPage,
});

function StudentPage() {
  const { studentId } = Route.useParams();
  const { data: students } = useSuspenseQuery(studentsQuery);
  const child = students.find(({ id }) => id === studentId);
  if (!child) return null;
  return child.role === 'guardian' ? <ParentView child={child} /> : <RelativeView child={child} />;
}

/** A relative reads the child's week, and may leave the child's adults; nothing else of them is theirs. */
function RelativeView({ child }: { child: Student }) {
  const week = useQuery(summaryQuery(child.id));
  return (
    <AdultPage title={`Gérer ${child.name}`} subtitle={LEVEL_LABELS[child.level]}>
      <p className="text-foreground">Vous suivez les devoirs de {child.name}.</p>
      <WeekSummary week={week.data} failed={week.isError} name={child.name} reader="guardian" />
      {child.parents.length > 0 && <p className="text-muted-foreground">{askParents(child.parents)}</p>}
      <LeaveChild child={child} />
    </AdultPage>
  );
}

function LeaveChild({ child }: { child: Student }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: me } = useSuspenseQuery(meQuery);
  const leaving = useConfirmation();
  const leave = useMutation({
    mutationFn: () => removeAdult(child.id, me?.id ?? ''),
    // The child out of the list first: the home never shows them again, even for a moment.
    onSuccess: async () => {
      queryClient.setQueryData(studentsQuery.queryKey, (list) => list?.filter(({ id }) => id !== child.id));
      await navigate({ to: '/foyer' });
      await queryClient.invalidateQueries({ queryKey: studentsQuery.queryKey });
    },
  });

  return leaving.confirming ? (
    <>
      <Banner
        tone="warning"
        focusOnMount
        title={`Vous ne verrez plus les devoirs de ${child.name}. Un parent de ${child.name} pourra vous inviter de nouveau.`}
      />
      {leave.error && <Banner tone="error" title={householdMessage(leave.error)} />}
      <Button
        disabled={leave.isPending}
        onClick={() => {
          leave.mutate();
        }}
      >
        Me retirer
      </Button>
      <Button variant="tonal" onClick={leaving.cancel}>
        Annuler
      </Button>
    </>
  ) : (
    <Button
      ref={leaving.opener('confirm')}
      variant="outline"
      onClick={() => {
        leaving.open('confirm');
      }}
      className="sm:self-start"
    >
      Me retirer des adultes de {child.name}
    </Button>
  );
}

function ParentView({ child }: { child: Student }) {
  const week = useQuery(summaryQuery(child.id));
  const activation = useActivation(child.id);
  const first = activation.devices.length === 0;

  return (
    <AdultPage title={`Gérer ${child.name}`} subtitle={LEVEL_LABELS[child.level]} wide>
      <p className="text-foreground">{decidesWith(child.name, child.parents)}</p>
      {child.deletion && <DeletionAsked child={child} deletion={child.deletion} />}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-12">
        <div className="flex flex-col gap-6">
          {first && <ChildDevices child={child} activation={activation} />}
          <WeekSummary week={week.data} failed={week.isError} name={child.name} reader="guardian" />
          {!first && <ChildDevices child={child} activation={activation} />}
          <ForgottenCode child={child} activation={activation} />
        </div>
        <div className="flex flex-col gap-6">
          <ChildAdults child={child} />
          <Fold title="Plus">
            <div className="flex flex-col gap-6">
              <Section title="Ce que Tom retient" level={3}>
                <Memory child={child} />
              </Section>
              <Section title="Son prénom et sa classe" level={3}>
                <EditStudent child={child} />
              </Section>
              <Section title="Historique" level={3}>
                <ChildHistory child={child} />
              </Section>
              {/* Asked already: the notice at the top of the page says it, and cancels it. */}
              {!child.deletion && (
                <Section title="Supprimer son compte" level={3}>
                  <DeleteStudent child={child} />
                </Section>
              )}
            </div>
          </Fold>
        </div>
      </div>
    </AdultPage>
  );
}

/**
 * The other adults of the child, and the invitations still waiting: a parent removes a relative,
 * never another parent, and invites an adult.
 */
function ChildAdults({ child }: { child: Student }) {
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(adultsQuery(child.id));
  // Its adults and its history.
  const refresh = () =>
    Promise.all([adultsQuery(child.id), historyQuery(child.id)].map(({ queryKey }) => queryClient.invalidateQueries({ queryKey })));
  const removal = useConfirmation<string>();
  const remove = useMutation({
    mutationFn: (adultId: string) => removeAdult(child.id, adultId),
    onSuccess: () => {
      removal.close();
      return refresh();
    },
  });
  // A mistyped address keeps no way to the child: the invitation is withdrawn at once, and can be sent again.
  const withdraw = useMutation({
    mutationFn: (invitationId: string) => withdrawInvitation(child.id, invitationId),
    onSettled: refresh,
  });
  const nobody = data.adults.length === 0 && data.invitations.length === 0;

  return (
    <Section title={`Les adultes de ${child.name}`}>
      {nobody ? (
        <p className="text-muted-foreground">Personne d’autre ne suit {child.name} dans Catiche.</p>
      ) : (
        <List>
          {data.adults.map((adult) => (
            <ListItem key={adult.id} title={adult.name} meta={capitalised(ROLE_LABELS[adult.role])}>
              {adult.role === 'relative' && removal.confirming !== adult.id && (
                <Button
                  ref={removal.opener(adult.id)}
                  variant="outline"
                  onClick={() => {
                    removal.open(adult.id);
                  }}
                >
                  Retirer
                </Button>
              )}
            </ListItem>
          ))}
          {data.invitations.map((invitation) => (
            <ListItem
              key={invitation.id}
              title={invitation.email}
              meta={`${capitalised(ROLE_LABELS[invitation.role])}, invitation du ${formatDay(invitation.createdAt)}, en attente`}
            >
              <Button
                variant="outline"
                disabled={withdraw.isPending}
                onClick={() => {
                  withdraw.mutate(invitation.id);
                }}
              >
                Annuler l’invitation
              </Button>
            </ListItem>
          ))}
        </List>
      )}
      {withdraw.error && <Banner tone="error" title={householdMessage(withdraw.error)} />}
      {removal.confirming !== null && (
        <>
          <Banner
            tone="warning"
            focusOnMount
            title={`${data.adults.find(({ id }) => id === removal.confirming)?.name ?? ''} ne verra plus les devoirs de ${child.name}.`}
          />
          {remove.error && <Banner tone="error" title={householdMessage(remove.error)} />}
          <Button
            disabled={remove.isPending}
            onClick={() => {
              if (removal.confirming !== null) remove.mutate(removal.confirming);
            }}
          >
            Retirer
          </Button>
          <Button variant="tonal" onClick={removal.cancel}>
            Annuler
          </Button>
        </>
      )}
      <Button render={<Link to="/foyer/$studentId/inviter" params={{ studentId: child.id }} />} variant="tonal" className="sm:self-start">
        Inviter un adulte
      </Button>
    </Section>
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
            <Button variant="tonal" onClick={withdrawal.cancel}>
              Annuler
            </Button>
          </>
        ) : (
          <Button
            ref={withdrawal.opener('confirm')}
            // Withdrawing erases what Tom keeps, a grave gesture; proposing is not.
            variant={child.memory.proposed ? 'outline' : 'tonal'}
            disabled={propose.isPending}
            onClick={() => {
              if (child.memory.proposed) withdrawal.open('confirm');
              else propose.mutate(true);
            }}
          >
            {child.memory.proposed ? 'Retirer' : `Proposer à ${child.name}`}
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
      <SelectField label="Sa classe" options={LEVEL_OPTIONS} {...form.register('level')} error={form.formState.errors.level?.message} />
      {update.error && <Banner tone="error" title={householdMessage(update.error)} />}
      <Button type="submit" variant="tonal" disabled={update.isPending}>
        Enregistrer
      </Button>
    </form>
  );
}
