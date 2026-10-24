import Bowser from 'bowser';

/** A device as a person names it, from its browser's user agent: « iOS · Safari ». */
export function deviceName(userAgent: string | null | undefined): string {
  if (!userAgent) return 'Appareil inconnu';
  const { os, browser } = Bowser.parse(userAgent);
  const name = [os.name, browser.name].filter(Boolean).join(' · ');
  return name || 'Appareil inconnu';
}

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

/** A device's kind, from its user agent; « appareil » when it cannot tell (`app-cible.md` § 5, « Les noms »). */
export function deviceKind(userAgent: string | null | undefined): DeviceKind {
  const type = userAgent ? Bowser.parse(userAgent).platform.type : undefined;
  return type === 'mobile' || type === 'tablet' || type === 'desktop' ? KINDS[type] : KINDS.unknown;
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
