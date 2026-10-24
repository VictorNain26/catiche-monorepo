import { describe, expect, it } from 'bun:test';
import { historyLine, type HistoryLine } from './history';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

const line = (kind: HistoryLine['kind'], detail: HistoryLine['detail'] = {}, actor: string | null = 'Nadia', subject: string | null = null) =>
  historyLine({ kind, detail, actor, subject }, 'Léa');

describe('historyLine', () => {
  it('says who changed the child’s first name or class, and to what', () => {
    expect(line('name_changed', { name: 'Léna' })).toBe('Nadia a changé le prénom en Léna');
    expect(line('level_changed', { level: 'quatrieme' })).toBe('Nadia a changé la classe : quatrième');
  });

  it('says the memory proposed or withdrawn', () => {
    expect(line('memory_proposed')).toBe('Nadia a proposé la mémoire de Tom à Léa');
    expect(line('memory_withdrawn')).toBe('Nadia a retiré ce que Tom retient');
  });

  it('says each starting code by what it was for', () => {
    expect(line('device_code')).toBe('Nadia a demandé un code de départ pour un appareil');
    expect(line('forgotten_code')).toBe('Nadia a demandé un code de départ pour un code oublié');
  });

  it('names the device unblocked or removed, by its browser when it can', () => {
    expect(line('device_unblocked', { device: IPHONE })).toBe('Nadia a débloqué le téléphone (iOS · Safari)');
    expect(line('device_removed', { device: IPHONE })).toBe('Nadia a retiré le téléphone (iOS · Safari)');
    expect(line('device_removed', { device: null })).toBe('Nadia a retiré l’appareil');
  });

  it('says the adults invited, come in, removed or gone, without supposing anyone’s gender', () => {
    expect(line('adult_invited', { role: 'relative' }, 'Nadia', 'Paul')).toBe('Nadia a invité Paul pour Léa, comme proche');
    expect(line('invitation_withdrawn', {}, 'Nadia', 'Paul')).toBe('Nadia a annulé l’invitation de Paul');
    expect(line('adult_joined', { role: 'guardian' }, 'Karim')).toBe('Karim a rejoint les adultes de Léa, comme parent');
    expect(line('adult_removed', {}, 'Nadia', 'Monique')).toBe('Nadia a retiré Monique des adultes de Léa');
    expect(line('adult_left', {}, 'Monique')).toBe('Monique a quitté les adultes de Léa');
  });

  it('names no address: an adult invited without an account, or gone since, is « un adulte »', () => {
    expect(line('adult_invited', { role: 'relative' })).toBe('Nadia a invité un adulte pour Léa, comme proche');
    expect(line('invitation_withdrawn')).toBe('Nadia a annulé l’invitation d’un adulte');
    expect(line('adult_removed')).toBe('Nadia a retiré un proche des adultes de Léa');
  });

  it('names an adult who has left Catiche, or not given a first name yet, as an adult', () => {
    expect(line('memory_withdrawn', {}, null)).toBe('Un adulte a retiré ce que Tom retient');
    expect(line('memory_withdrawn', {}, '')).toBe('Un adulte a retiré ce que Tom retient');
  });
});
