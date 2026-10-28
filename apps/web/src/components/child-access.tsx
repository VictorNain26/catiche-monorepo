import { Banner, Button, Card, List, ListItem, Section } from '@repo/ui';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { formatCode } from '../lib/activation';
import { isProblem } from '../lib/api';
import { useConfirmation } from '../lib/confirmation';
import { RecentEntry } from './recent-entry';
import { deviceKind, deviceName, formatDay, formatHour } from '../lib/device';
import { historyQuery } from '../lib/history';
import {
  activationCode,
  householdMessage,
  removeDevice,
  studentDevicesQuery,
  studentsQuery,
  unblockDevice,
  type ActivationReason,
  type Student,
} from '../lib/household';
import { capitalised } from '../lib/words';

const WATCH_MS = 10 * 60_000;

/**
 * A starting code of the parent's, for a new device or for a code the child forgot: shown until it
 * expires or a device holds one more profile of the child, the list of devices watched meanwhile.
 */
export function useActivation(studentId: string) {
  const queryClient = useQueryClient();
  // The devices that held the child's profile when the code was asked for: one more, and it is spent.
  const [before, setBefore] = useState<ReadonlySet<string> | null>(null);
  const [expired, setExpired] = useState<string | null>(null);
  const activation = useMutation({
    mutationFn: (reason: ActivationReason) => activationCode(studentId, reason),
    // Its line in the child's history.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: historyQuery(studentId).queryKey }),
  });
  // Nothing else renders the page when a code expires.
  useEffect(() => {
    if (!activation.data) return;
    const { code, expiresAt } = activation.data;
    const timer = setTimeout(
      () => {
        setExpired(code);
      },
      Date.parse(expiresAt) - Date.now(),
    );
    return () => {
      clearTimeout(timer);
    };
  }, [activation.data]);
  const spent = (list: readonly { id: string }[]) => before !== null && list.some(({ id }) => !before.has(id));
  const pending = (list: readonly { id: string }[]) => activation.data !== undefined && activation.data.code !== expired && !spent(list);
  // While a code waits, the list shows the device the moment it holds the profile, and the code
  // goes: every 5 seconds the first ten minutes, while the parent is likely at the other device;
  // then each time the page comes back to the front, as a code for a device lasts a day.
  const { data } = useSuspenseQuery({
    ...studentDevicesQuery(studentId),
    refetchInterval: (query) => (pending(query.state.data?.devices ?? []) && Date.now() - activation.submittedAt < WATCH_MS ? 5000 : false),
  });
  return {
    devices: data.devices,
    /** Whether the child chose a code, and whether too many tries locked it. */
    childCode: data.code,
    /** The parent's code on the screen, while it waits for the child's device. */
    code: pending(data.devices) ? activation.data : undefined,
    added: spent(data.devices),
    ask: (reason: ActivationReason) => {
      setBefore(new Set(data.devices.map(({ id }) => id)));
      activation.mutate(reason);
    },
    asking: activation.isPending,
    /** The code refused for an entry too old: a recent one confirms it (`RecentEntry`), then it is asked again. */
    stale: isProblem(activation.error, 'SESSION_NOT_FRESH'),
    error: activation.error,
  };
}

type Activation = ReturnType<typeof useActivation>;

/** After a gesture on one of the child's devices: their devices, the home's alerts, their history. */
function useDevicesChanged(studentId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: studentsQuery.queryKey, exact: true }),
      queryClient.invalidateQueries({ queryKey: studentDevicesQuery(studentId).queryKey }),
      queryClient.invalidateQueries({ queryKey: historyQuery(studentId).queryKey }),
    ]);
}

/** « Débloquer », on « Gérer » as on the home's alert. */
export function useUnblockDevice(studentId: string) {
  const changed = useDevicesChanged(studentId);
  return useMutation({ mutationFn: (deviceId: string) => unblockDevice(studentId, deviceId), onSettled: changed });
}

/**
 * « Ses appareils » (A7): the devices that hold the child's profile, each unblocked, with its
 * cause, or removed once confirmed; and a way to add one (A4).
 */
export function ChildDevices({ child, activation }: { child: Student; activation: Activation }) {
  const changed = useDevicesChanged(child.id);
  const removal = useConfirmation<string>();
  const unblock = useUnblockDevice(child.id);
  const remove = useMutation({
    mutationFn: (deviceId: string) => removeDevice(child.id, deviceId),
    onSuccess: removal.close,
    onSettled: changed,
  });
  const failure = unblock.error ?? remove.error;

  return (
    <Section title="Ses appareils">
      {activation.devices.length === 0 ? (
        <p className="text-muted-foreground">Aucun appareil pour l’instant.</p>
      ) : (
        <List>
          {activation.devices.map((device) => {
            const kind = deviceKind(device.userAgent);
            return (
              <ListItem
                key={device.id}
                title={deviceName(device.userAgent)}
                meta={[
                  device.blocked ? `${capitalised(kind.blocked)} après 3 codes faux` : null,
                  device.shared ? 'Partagé' : null,
                  `Ajouté le ${formatDay(device.createdAt)}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              >
                <span className="flex flex-col gap-2 sm:flex-row">
                  {device.blocked && (
                    <Button
                      disabled={unblock.isPending}
                      onClick={() => {
                        unblock.mutate(device.id);
                      }}
                    >
                      Débloquer
                    </Button>
                  )}
                  {removal.confirming !== device.id && (
                    <Button
                      ref={removal.opener(device.id)}
                      variant="outline"
                      onClick={() => {
                        removal.open(device.id);
                      }}
                    >
                      Retirer {kind.this}
                    </Button>
                  )}
                </span>
              </ListItem>
            );
          })}
        </List>
      )}
      {removal.confirming !== null && (
        <>
          <Banner tone="warning" focusOnMount title={`${child.name} devra entrer un nouveau code de départ sur cet appareil.`} />
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
      {failure && <Banner tone="error" title={householdMessage(failure)} />}
      <Button render={<Link to="/foyer/$studentId/appareil" params={{ studentId: child.id }} />} variant="tonal" className="sm:self-start">
        Ajouter un appareil
      </Button>
    </Section>
  );
}

/**
 * « Léa a oublié son code » (A7): a starting code, once the child has a code; the old one stops
 * when the child types it. Its text says what follows, before the button.
 */
export function ForgottenCode({ child, activation }: { child: Student; activation: Activation }) {
  if (!activation.childCode.chosen) return null;
  return (
    <Section title={`${child.name} a oublié son code`}>
      {activation.childCode.locked && (
        <Banner tone="warning" title={`Le code de ${child.name} ne marche plus.`}>
          Trop de codes faux l’ont arrêté sur tous ses appareils.
        </Banner>
      )}
      <p className="text-muted-foreground">
        Son code actuel ne marchera plus, nulle part. Avec le code de départ que vous allez obtenir, {child.name} en choisira un nouveau, et verra la
        date du changement.
      </p>
      <p className="text-muted-foreground">Ce code arrête aussi un code de départ donné avant, s’il n’a pas encore servi.</p>
      <ForgottenCodeGesture child={child} activation={activation} label="Obtenir un code de départ" />
    </Section>
  );
}

/**
 * The starting code after a forgotten one, asked and shown: the recent entry it needs first when
 * the parent's is too old, then its button again; the code, once given, until the child's device
 * spends it. On « Gérer » (A7) and on the home's card (A5), by one gesture.
 */
export function ForgottenCodeGesture({
  child,
  activation,
  label,
  primary = false,
}: {
  child: Student;
  activation: Activation;
  label: string;
  /**
   * The screen's main button, in the child's card of the home (A5): the code then shows on the
   * secondary's ground (`muted-foreground` on it is tested), never a card in a card.
   */
  primary?: boolean;
}) {
  const { code } = activation;
  const shown = code && (
    <>
      <p>
        Sur l’appareil de {child.name}, ouvrez {window.location.origin}/activer et saisissez :
      </p>
      <p className="font-mono text-3xl tracking-widest">{formatCode(code.code)}</p>
      <p className="text-sm text-muted-foreground">Valable jusqu’à {formatHour(code.expiresAt)}, une seule fois.</p>
    </>
  );
  return (
    <>
      {shown &&
        (primary ? (
          <div className="flex flex-col items-center gap-2 rounded-control bg-secondary p-4 text-center text-secondary-foreground">{shown}</div>
        ) : (
          <Card className="flex flex-col items-center gap-2 text-center">{shown}</Card>
        ))}
      {activation.added && <Banner tone="success" title={`L’appareil de ${child.name} est ajouté.`} />}
      {activation.stale ? (
        <RecentEntry
          why="Par sécurité, un code de départ se donne dans les 10 minutes qui suivent votre entrée."
          onConfirmed={() => {
            activation.ask('forgotten');
          }}
        />
      ) : (
        activation.error && <Banner tone="error" title={householdMessage(activation.error)} />
      )}
      {!code && (
        <Button
          variant={primary ? 'default' : 'tonal'}
          className="sm:self-start"
          disabled={activation.asking}
          onClick={() => {
            activation.ask('forgotten');
          }}
        >
          {label}
        </Button>
      )}
    </>
  );
}
