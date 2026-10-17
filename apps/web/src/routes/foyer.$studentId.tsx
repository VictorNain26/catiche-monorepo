import { zodResolver } from '@hookform/resolvers/zod';
import { Banner, Button, Card, Fold, toast } from '@repo/ui';
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from '../lib/zod';
import { Field, SelectField } from '../components/field';
import { BackLink, Page } from '../components/page';
import { QrCode } from '../components/qr-code';
import { WeekSummary } from '../components/week-summary';
import { api, isProblem, parseResponse } from '../lib/api';
import { authClient, authData, deviceSessionsQuery } from '../lib/auth';
import { deviceName, formatDay, formatHour } from '../lib/device';
import { formatCode, pairingLink } from '../lib/pairing';
import { summaryQuery } from '../lib/summary';
import { LEVEL_LABELS, devicesQuery, householdMessage, memoryStatus, studentSchema, studentsQuery, type Student } from '../lib/household';

const student = api.household.students[':id'];

/**
 * One child of the household. Until a device holds their space, the page opens on the next step:
 * the family's phone in 6e and 5e, their own in 4e and 3e. Then their week; their devices, their
 * memory, their name and class and their account folded, a tap away.
 */
export const Route = createFileRoute('/foyer/$studentId')({
  loader: async ({ context, params }) => {
    // Started, not awaited: the week failing leaves the child's page, which says so.
    void context.queryClient.query(summaryQuery(params.studentId)).catch(() => undefined);
    const students = await context.queryClient.query(studentsQuery);
    if (!students.some(({ id }) => id === params.studentId)) throw redirect({ to: '/foyer' });
    await context.queryClient.query(devicesQuery(params.studentId));
  },
  component: StudentPage,
});

function StudentPage() {
  const { studentId } = Route.useParams();
  const { data: students } = useSuspenseQuery(studentsQuery);
  const week = useQuery(summaryQuery(studentId));
  const child = students.find(({ id }) => id === studentId);
  const pairing = usePairing(studentId, child?.name ?? '');
  if (!child) return null;

  return (
    <Page title={child.name} subtitle={LEVEL_LABELS[child.level]} back={<BackLink to="/foyer">Retour au foyer</BackLink>}>
      {pairing.firstStep ? <NextStep child={child} pairing={pairing} /> : child.accompanied && <OpenHere child={child} />}
      <WeekSummary week={week.data} failed={week.isError} name={child.name} reader="guardian" />
      <div className="flex flex-col">
        <Fold title="Ses appareils">
          <Devices child={child} pairing={pairing} />
        </Fold>
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

/**
 * The pairing of a device of the child's: a code asked, then their devices watched until one more
 * holds their space. A code leaves the screen once spent or expired, and a code a device spent
 * never shows again, even once that device is disconnected. The first step stays, said done, until
 * the page is left: the parent reads it where the code was.
 */
function usePairing(studentId: string, name: string) {
  const queryClient = useQueryClient();
  // The devices paired when the code was asked for: one more, and the code is spent.
  const [before, setBefore] = useState<ReadonlySet<string> | null>(null);
  const [expired, setExpired] = useState<string | null>(null);
  const pairing = useMutation({ mutationFn: () => parseResponse(student['pairing-code'].$post({ param: { id: studentId } })) });
  // Nothing else renders the page when a code expires.
  useEffect(() => {
    if (!pairing.data) return;
    const { code, expiresAt } = pairing.data;
    const timer = setTimeout(
      () => {
        setExpired(code);
      },
      Date.parse(expiresAt) - Date.now(),
    );
    return () => {
      clearTimeout(timer);
    };
  }, [pairing.data]);
  const spent = (list: readonly { id: string }[]) => before !== null && list.some(({ id }) => !before.has(id));
  const pending = (list: readonly { id: string }[]) => pairing.data !== undefined && pairing.data.code !== expired && !spent(list);
  // While a code waits on the child's device, the list shows it the moment it is redeemed.
  const { data: devices } = useSuspenseQuery({
    ...devicesQuery(studentId),
    refetchInterval: (query) => (pending(query.state.data ?? []) ? 5000 : false),
  });
  const revoke = useMutation({
    mutationFn: (deviceId: string) => parseResponse(student.devices[':deviceId'].$delete({ param: { id: studentId, deviceId } })),
    onSuccess: (_, deviceId) => {
      if (before !== null && !before.has(deviceId)) {
        setBefore(null);
        pairing.reset();
      }
      return queryClient.invalidateQueries({ queryKey: devicesQuery(studentId).queryKey });
    },
  });

  const redeemed = spent(devices);
  // The pairing happens on the child's device: read out here when the list shows it.
  useEffect(() => {
    if (redeemed) toast(`L’appareil de ${name} est relié.`);
  }, [redeemed, name]);
  return {
    devices,
    firstStep: devices.length === 0 || (redeemed && before?.size === 0),
    code: pending(devices) ? pairing.data : undefined,
    redeemed,
    ask: () => {
      setBefore(new Set(devices.map(({ id }) => id)));
      pairing.mutate();
    },
    asking: pairing.isPending,
    error: pairing.error,
    revoke,
  };
}

type Pairing = ReturnType<typeof usePairing>;

function NextStep({ child, pairing }: { child: Student; pairing: Pairing }) {
  return (
    <section aria-labelledby="next-step" className="flex flex-col gap-3">
      <h2 id="next-step" className="text-xl font-bold text-foreground">
        Prochaine étape
      </h2>
      {child.accompanied ? (
        <OpenHere child={child} />
      ) : (
        <>
          <p>{child.name} fait ses devoirs sur son téléphone : un code à usage unique le relie à son compte, sans mot de passe.</p>
          {pairing.redeemed ? (
            <Banner tone="success" title={`L’appareil de ${child.name} est relié.`} />
          ) : (
            <PairingCode pairing={pairing} device="son téléphone" label={`Relier le téléphone de ${child.name}`} name={child.name} />
          )}
        </>
      )}
    </section>
  );
}

/**
 * The family's phone, handed to a child in 6e or 5e: their session if the device holds it,
 * otherwise one paired here by the app, no code to copy. The server then closes the guardian's
 * session on it (platform/auth/pairing.ts): coming back takes the guardian's passkey or a code.
 * From the 4e, the child's space opens on no device of the guardian's (`decisions.md`).
 */
function OpenHere({ child }: { child: Student }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const open = useMutation({
    mutationFn: async () => {
      const held = await queryClient.query(deviceSessionsQuery);
      const own = held.find(({ user }) => user.id === child.id);
      await (own
        ? authData(authClient.multiSession.setActive({ sessionToken: own.session.token }))
        : authData(
            authClient.devicePairing.redeem({ code: (await parseResponse(student['pairing-code'].$post({ param: { id: child.id } }))).code }),
          ));
      // Loaded afresh: nothing of the guardian's stays in memory.
      await navigate({ to: '/', reloadDocument: true });
    },
  });

  return (
    <section className="flex flex-col gap-3">
      <Button
        disabled={open.isPending}
        onClick={() => {
          open.mutate();
        }}
      >
        Faire les devoirs avec {child.name}
      </Button>
      <p className="text-sm text-muted-foreground">
        À chaque séance, {child.name} choisit : avec vous à côté, ou sans vous ce soir. À côté, Tom vous propose quoi dire, jamais la réponse.
      </p>
      <p className="text-sm text-muted-foreground">Pour revenir au vôtre, il vous faudra votre clé d’accès ou un code.</p>
      {open.error && <Banner tone="error" title={open.error.message} />}
    </section>
  );
}

/** A code for the child's device: `device` says which, « son téléphone » or « son autre appareil ». */
function PairingCode({ pairing, device, label, name }: { pairing: Pairing; device: string; label: string; name: string }) {
  const { code } = pairing;
  return (
    <>
      {code && (
        <>
          <p>Avec l’appareil photo de {device}, visez ce code :</p>
          <QrCode text={pairingLink(window.location.origin, code.code)} label={`QR code pour relier l’appareil de ${name}`} />
          <p>
            Ou, sur {device}, ouvrez {window.location.origin}/jumeler et saisissez :
          </p>
          <p className="self-center font-mono text-3xl tracking-widest">{formatCode(code.code)}</p>
          <p className="text-sm text-muted-foreground">Valable jusqu’à {formatHour(code.expiresAt)}, une seule fois.</p>
        </>
      )}
      {pairing.error && <Banner tone="error" title={householdMessage(pairing.error)} />}
      <Button disabled={pairing.asking} onClick={pairing.ask}>
        {code ? 'Nouveau code' : label}
      </Button>
    </>
  );
}

function Devices({ child, pairing }: { child: Student; pairing: Pairing }) {
  const { devices, revoke } = pairing;
  return (
    <>
      {devices.length === 0 ? (
        <p className="text-muted-foreground">Aucun appareil relié.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {devices.map((device) => (
            <Card render={<li />} key={device.id} className="flex items-center justify-between gap-3">
              <span className="flex flex-col">
                <span className="font-bold">{deviceName(device.userAgent)}</span>
                <span className="text-sm text-muted-foreground">Relié le {formatDay(device.pairedAt)}</span>
              </span>
              <Button
                variant="outline"
                disabled={revoke.isPending}
                onClick={() => {
                  revoke.mutate(device.id);
                }}
              >
                Déconnecter
              </Button>
            </Card>
          ))}
        </ul>
      )}
      {revoke.error && <Banner tone="error" title={householdMessage(revoke.error)} />}
      {child.accompanied ? (
        <p className="text-muted-foreground">
          En 6e et 5e, {child.name} travaille sur l’appareil de la famille ; relier son propre appareil devient possible en 4e.
        </p>
      ) : (
        // Until a device holds the child's space, the code is asked for in the next step.
        !pairing.firstStep && (
          <>
            {pairing.redeemed ? (
              <Banner tone="success" title={`L’appareil de ${child.name} est relié.`} />
            ) : (
              !pairing.code && (
                <p className="text-muted-foreground">
                  Un code à usage unique relie un autre appareil de {child.name} à son compte, sans mot de passe.
                </p>
              )
            )}
            <PairingCode pairing={pairing} device="son autre appareil" label="Relier un autre appareil" name={child.name} />
          </>
        )
      )}
    </>
  );
}

function Memory({ child }: { child: Student }) {
  const queryClient = useQueryClient();
  const [withdrawing, setWithdrawing] = useState(false);
  const propose = useMutation({
    mutationFn: (memoryProposed: boolean) => parseResponse(student.$patch({ param: { id: child.id }, json: { memoryProposed } })),
    onSuccess: () => {
      setWithdrawing(false);
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
        (withdrawing ? (
          <>
            <Banner
              tone="error"
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
            <Button
              variant="outline"
              onClick={() => {
                setWithdrawing(false);
              }}
            >
              Annuler
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            disabled={propose.isPending}
            onClick={() => {
              if (child.memory.proposed) setWithdrawing(true);
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
    mutationFn: (json: z.output<typeof studentSchema>) => parseResponse(student.$patch({ param: { id: child.id }, json })),
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
  const [confirming, setConfirming] = useState(false);
  const remove = useMutation({
    mutationFn: () => parseResponse(student.$delete({ param: { id: child.id } })),
    onSuccess: async () => {
      await navigate({ to: '/foyer' });
      await queryClient.invalidateQueries({ queryKey: studentsQuery.queryKey });
    },
  });

  return confirming ? (
    <>
      <Banner tone="error" title="Ses séances seront effacées et ses appareils déconnectés. C’est définitif." />
      {remove.error && <Banner tone="error" title={householdMessage(remove.error)} />}
      <Button
        disabled={remove.isPending}
        onClick={() => {
          remove.mutate();
        }}
      >
        Supprimer définitivement
      </Button>
      <Button
        variant="outline"
        onClick={() => {
          setConfirming(false);
        }}
      >
        Annuler
      </Button>
    </>
  ) : (
    <Button
      variant="outline"
      onClick={() => {
        setConfirming(true);
      }}
    >
      Supprimer le compte de {child.name}
    </Button>
  );
}
