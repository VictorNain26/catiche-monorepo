import { Banner, Button, Card, List, ListItem, Section } from '@repo/ui';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { formatCode } from '../lib/activation';
import { AuthFailure, authClient, authData, hasCode } from '../lib/auth';
import { useConfirmation } from '../lib/confirmation';
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
import { announceProfileChange, keepChooseTokens, tabChannel } from '../lib/student';
import { CodeForm, sendCode } from './code-form';

/**
 * A code of the parent's, for a new device or for a code the child forgot: shown until it expires
 * or a device holds one more profile of the child, the list of devices watched meanwhile.
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
  // While a code waits, the list shows the device the moment it holds the profile, and the code goes.
  const { data } = useSuspenseQuery({
    ...studentDevicesQuery(studentId),
    refetchInterval: (query) => (pending(query.state.data?.devices ?? []) ? 5000 : false),
  });
  return {
    devices: data.devices,
    /** Whether the child chose a code, and whether too many tries locked it. */
    childCode: data.code,
    /** The parent's code on the screen, while it waits for the child's device. */
    code: pending(data.devices) ? activation.data : undefined,
    reason: activation.variables,
    added: spent(data.devices),
    ask: (reason: ActivationReason) => {
      setBefore(new Set(data.devices.map(({ id }) => id)));
      activation.mutate(reason);
    },
    asking: activation.isPending,
    error: activation.error,
  };
}

type Activation = ReturnType<typeof useActivation>;

/** The parent's codes and the child's devices: one column on a phone, side by side on a computer. */
export function ChildAccess({ child, activation }: { child: Student; activation: Activation }) {
  return (
    <div className="flex flex-col gap-8 lg:grid lg:grid-cols-2 lg:items-start lg:gap-12">
      <Codes child={child} activation={activation} />
      <Devices child={child} activation={activation} />
    </div>
  );
}

/** The parent's codes: one for a new device of the child's, one for a code they forgot. */
function Codes({ child, activation }: { child: Student; activation: Activation }) {
  const forgetting = useConfirmation();
  const { code } = activation;
  return (
    <Section
      title={activation.devices.length === 0 ? 'Prochaine étape' : 'Codes'}
      description={`Votre code relie un appareil de ${child.name}. ${child.name} y choisit ensuite son propre code, que vous ne voyez pas.`}
    >
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
      {activation.error && <Banner tone="error" title={householdMessage(activation.error)} />}
      <Button
        disabled={activation.asking}
        onClick={() => {
          activation.ask('device');
        }}
      >
        {code && activation.reason === 'device' ? 'Nouveau code' : 'Code pour un nouvel appareil'}
      </Button>
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
            onClick={() => {
              forgetting.open('confirm');
            }}
          >
            {child.name} a oublié son code
          </Button>
        )
      )}
    </Section>
  );
}

/** The devices that hold the child's profile: each one unblocked or disconnected; this computer added. */
function Devices({ child, activation }: { child: Student; activation: Activation }) {
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
      <AddThisComputer child={child} />
    </Section>
  );
}

/**
 * The family computer, the parent at it: the child's profile goes on it, shared, and the child
 * chooses their code right away. Within minutes of the parent's entering (the server's freshAge);
 * past them, a code confirms who is there first.
 */
function AddThisComputer({ child }: { child: Student }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [stale, setStale] = useState(false);
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const add = useMutation({
    mutationFn: async () => {
      let added;
      try {
        added = await authData(authClient.student.addProfiles({ studentIds: [child.id] }));
      } catch (error) {
        if (error instanceof AuthFailure && hasCode(error, 'SESSION_NOT_FRESH')) {
          setStale(true);
          return;
        }
        throw error;
      }
      // In this tab's memory only: the child chooses their code here, now; no one later.
      keepChooseTokens(added.chooseTokens);
      announceProfileChange(tabChannel());
      queryClient.clear();
      await navigate({ to: '/profils/$studentId', params: { studentId: child.id } });
    },
  });
  const askCode = useMutation({
    mutationFn: async () => {
      const session = await authData(authClient.getSession());
      if (!session) return;
      await authData(sendCode(session.user.email));
      setCodeSentTo(session.user.email);
    },
  });
  const failure = add.error ?? askCode.error;

  if (codeSentTo) {
    return (
      <CodeForm
        email={codeSentTo}
        submitLabel="Confirmer"
        onEntered={() => {
          setCodeSentTo(null);
          setStale(false);
        }}
      />
    );
  }
  return (
    <>
      <p className="text-muted-foreground">
        Sur l’ordinateur de la famille, ajoutez-y {child.name} : {child.name} y choisit son code tout de suite, à côté de vous. Sur un appareil
        partagé, chaque session se ferme après 10 minutes sans rien faire, la vôtre aussi.
      </p>
      {failure && <Banner tone="error" title={failure.message} />}
      {stale ? (
        <>
          <Banner tone="info" title="Confirmez d’abord avec un code reçu par e-mail">
            Par sécurité, un appareil s’ajoute dans les 10 minutes qui suivent votre entrée.
          </Banner>
          <Button
            variant="outline"
            disabled={askCode.isPending}
            onClick={() => {
              askCode.mutate();
            }}
          >
            Recevoir un code
          </Button>
        </>
      ) : (
        <Button
          variant="outline"
          disabled={add.isPending}
          onClick={() => {
            add.mutate();
          }}
        >
          Ajouter cet ordinateur
        </Button>
      )}
    </>
  );
}
