import Bowser from 'bowser';

/** A device's system and browser, from its user agent: « iOS · Safari »; null when it cannot be read. */
export function browserName(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null;
  const { os, browser } = Bowser.parse(userAgent);
  return [os.name, browser.name].filter(Boolean).join(' · ') || null;
}

/** A device as a person names it, from its browser's user agent: « iOS · Safari ». */
export const deviceName = (userAgent: string | null | undefined) => browserName(userAgent) ?? 'Appareil inconnu';

/** How a sentence names a device, by its kind: « la tablette », « cette tablette », « bloquée ». */
interface DeviceKind {
  the: string;
  this: string;
  blocked: string;
}

const KINDS: Record<'mobile' | 'tablet' | 'desktop' | 'unknown', DeviceKind> = {
  mobile: { the: 'le téléphone', this: 'ce téléphone', blocked: 'bloqué' },
  tablet: { the: 'la tablette', this: 'cette tablette', blocked: 'bloquée' },
  desktop: { the: 'l’ordinateur', this: 'cet ordinateur', blocked: 'bloqué' },
  unknown: { the: 'l’appareil', this: 'cet appareil', blocked: 'bloqué' },
};

/** The kind of device a user agent says, `unknown` when it cannot tell. */
function kindOf(userAgent: string | null | undefined): keyof typeof KINDS {
  const type = userAgent ? Bowser.parse(userAgent).platform.type : undefined;
  return type === 'mobile' || type === 'tablet' || type === 'desktop' ? type : 'unknown';
}

/** A device's kind, from its user agent; « appareil » when it cannot tell (`app-cible.md` § 5, « Les noms »). */
export const deviceKind = (userAgent: string | null | undefined): DeviceKind => KINDS[kindOf(userAgent)];

const KIND_NAMES: Record<keyof typeof KINDS, string> = { mobile: 'Téléphone', tablet: 'Tablette', desktop: 'Ordinateur', unknown: 'Appareil' };

/**
 * A passkey as « Vos clés d'accès » lists it (A9), by the user agent that made it: « Téléphone
 * Android, créée le 3 mars », as precise as the browser says.
 */
export function passkeyName(userAgent: string | null | undefined, createdAt: string | Date) {
  const system = userAgent ? Bowser.parse(userAgent).os.name : undefined;
  return `${[KIND_NAMES[kindOf(userAgent)], system].filter(Boolean).join(' ')}, créée le ${formatDate(createdAt)}`;
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
