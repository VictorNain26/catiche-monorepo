import { Banner, Button, Card, List, ListItem, Section } from '@repo/ui';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { formatCode } from '../lib/activation';
import { isProblem } from '../lib/api';
import { useConfirmation } from '../lib/confirmation';
import { RecentEntry } from './recent-entry';
import { deviceName, formatDay, formatHour } from '../lib/device';
import {
  activationCode,
  householdMessage,
  removeDevice,
  studentDevicesQuery,
  unblockDevice,
  type ActivationReason,
  type Student,
} from '../lib/household';

const WATCH_MS = 10 * 60_000;

/**
 * A starting code of the parent's, for a new device or for a code the child forgot: shown until it
 * expires or a device holds one more profile of the child, the list of devices watched meanwhile.
 */
export function useActivation(studentId: string) {
  // The devices that held the child's profile when the code was asked for: one more, and it is spent.
  const [before, setBefore] = useState<ReadonlySet<string> | null>(null);
  const [expired, setExpired] = useState<string | null>(null);
  const activation = useMutation({ mutationFn: (reason: ActivationReason) => activationCode(studentId, reason) });
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

/**
 * The devices that hold the child's profile, each one unblocked or disconnected; a way to add one
 * (A4); and a starting code for a code the child forgot.
 */
export function ChildAccess({ child, activation }: { child: Student; activation: Activation }) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: studentDevicesQuery(child.id).queryKey });
  const unblock = useMutation({ mutationFn: (deviceId: string) => unblockDevice(child.id, deviceId), onSettled: refresh });
  const remove = useMutation({ mutationFn: (deviceId: string) => removeDevice(child.id, deviceId), onSettled: refresh });
  const failure = unblock.error ?? remove.error;

  return (
    <Section title={`Appareils de ${child.name}`}>
      {activation.devices.length === 0 ? (
        <p className="text-muted-foreground">Aucun appareil pour l’instant.</p>
      ) : (
        <List>
          {activation.devices.map((device) => (
            <ListItem
              key={device.id}
              title={deviceName(device.userAgent)}
              meta={[device.blocked ? 'Bloqué : trop d’essais' : null, device.shared ? 'Partagé' : null, `Ajouté le ${formatDay(device.createdAt)}`]
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
                <Button
                  variant="outline"
                  disabled={remove.isPending}
                  onClick={() => {
                    remove.mutate(device.id);
                  }}
                >
                  Déconnecter
                </Button>
              </span>
            </ListItem>
          ))}
        </List>
      )}
      {failure && <Banner tone="error" title={householdMessage(failure)} />}
      <Button render={<Link to="/foyer/$studentId/appareil" params={{ studentId: child.id }} />} variant="outline" className="sm:self-start">
        Ajouter un appareil
      </Button>
      <ForgottenCode child={child} activation={activation} />
    </Section>
  );
}

/** A starting code for a code the child forgot: the old one stops when the child types it. */
function ForgottenCode({ child, activation }: { child: Student; activation: Activation }) {
  const forgetting = useConfirmation();
  const { code } = activation;
  return (
    <>
      {activation.childCode.locked && (
        <Banner tone="warning" title={`Trop d’essais : le code de ${child.name} ne marche plus nulle part.`}>
          Donnez-lui un code « oublié » : {child.name} en choisira un nouveau.
        </Banner>
      )}
      {code && (
        <Card className="flex flex-col items-center gap-2 text-center">
          <p>
            Sur l’appareil de {child.name}, ouvrez {window.location.origin}/activer et saisissez :
          </p>
          <p className="font-mono text-3xl tracking-widest">{formatCode(code.code)}</p>
          <p className="text-sm text-muted-foreground">Valable jusqu’à {formatHour(code.expiresAt)}, une seule fois.</p>
        </Card>
      )}
      {activation.added && <Banner tone="success" title={`L’appareil de ${child.name} est ajouté.`} />}
      {activation.stale ? (
        <RecentEntry
          onConfirmed={() => {
            activation.ask('forgotten');
          }}
        />
      ) : (
        activation.error && <Banner tone="error" title={householdMessage(activation.error)} />
      )}
      {forgetting.confirming ? (
        <>
          <Banner
            tone="warning"
            focusOnMount
            title={`Quand ${child.name} saisira ce code, son ancien code cessera de marcher et ses appareils seront déconnectés.`}
          >
            {child.name} choisira un nouveau code, et verra la date du changement.
          </Banner>
          <Button
            variant="outline"
            disabled={activation.asking}
            onClick={() => {
              forgetting.close();
              activation.ask('forgotten');
            }}
          >
            Obtenir le code
          </Button>
          <Button variant="link" onClick={forgetting.cancel}>
            Annuler
          </Button>
        </>
      ) : (
        activation.childCode.chosen && (
          <Button
            ref={forgetting.opener('confirm')}
            variant="outline"
            className="sm:self-start"
            onClick={() => {
              forgetting.open('confirm');
            }}
          >
            {child.name} a oublié son code
          </Button>
        )
      )}
    </>
  );
}
