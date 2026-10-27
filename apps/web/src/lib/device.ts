import Bowser from 'bowser';

/** A device's system and browser, from its user agent: « iOS · Safari »; null when it cannot be read. */
export function browserName(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null;
  const { os, browser } = Bowser.parse(userAgent);
  return [os.name, browser.name].filter(Boolean).join(' · ') || null;
}

/** A device as a person names it, from its browser's user agent: « iOS · Safari ». */
export const deviceName = (userAgent: string | null | undefined) => browserName(userAgent) ?? 'Appareil inconnu';

/** How a sentence names a device, by its kind: « Tablette », « la tablette », « une tablette », « cette tablette », « bloquée », « partagée ». */
interface DeviceKind {
  name: string;
  the: string;
  a: string;
  this: string;
  blocked: string;
  shared: string;
}

const KINDS: Record<'mobile' | 'tablet' | 'desktop' | 'unknown', DeviceKind> = {
  mobile: { name: 'Téléphone', the: 'le téléphone', a: 'un téléphone', this: 'ce téléphone', blocked: 'bloqué', shared: 'partagé' },
  tablet: { name: 'Tablette', the: 'la tablette', a: 'une tablette', this: 'cette tablette', blocked: 'bloquée', shared: 'partagée' },
  desktop: { name: 'Ordinateur', the: 'l’ordinateur', a: 'un ordinateur', this: 'cet ordinateur', blocked: 'bloqué', shared: 'partagé' },
  unknown: { name: 'Appareil', the: 'l’appareil', a: 'un appareil', this: 'cet appareil', blocked: 'bloqué', shared: 'partagé' },
};

/** The kind of device a user agent says, `unknown` when it cannot tell. */
function kindOf(userAgent: string | null | undefined): keyof typeof KINDS {
  const type = userAgent ? Bowser.parse(userAgent).platform.type : undefined;
  return type === 'mobile' || type === 'tablet' || type === 'desktop' ? type : 'unknown';
}

/** A device's kind, from its user agent; « appareil » when it cannot tell (`app-cible.md` § 5, « Les noms »). */
export const deviceKind = (userAgent: string | null | undefined): DeviceKind => KINDS[kindOf(userAgent)];

/** A device of the student's, as « Tes appareils » lists it (E6): « Ordinateur partagé, depuis le 2 octobre ». */
export function ownDeviceLine({ userAgent, shared, createdAt }: { userAgent: string | null; shared: boolean; createdAt: string }) {
  const kind = deviceKind(userAgent);
  return `${shared ? `${kind.name} ${kind.shared}` : kind.name}, depuis le ${formatDate(createdAt)}`;
}

/**
 * A passkey as « Vos clés d'accès » lists it (A9), by the user agent that made it: « Téléphone
 * Android, créée le 3 mars », as precise as the browser says.
 */
export function passkeyName(userAgent: string | null | undefined, createdAt: string | Date) {
  const system = userAgent ? Bowser.parse(userAgent).os.name : undefined;
  return `${[deviceKind(userAgent).name, system].filter(Boolean).join(' ')}, créée le ${formatDate(createdAt)}`;
}

const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
const date = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });
const hour = new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short' });

/** « 7 octobre 2026 à 14:32 » */
export const formatDay = (date: string | Date) => day.format(new Date(date));

/** « 3 mars » */
export const formatDate = (when: string | Date) => date.format(new Date(when));

/** « 14:32 » */
export const formatHour = (date: string | Date) => hour.format(new Date(date));
