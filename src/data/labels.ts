const CATEGORY_PT: Record<string, string> = {
  cardio: 'Cardio',
  'levantamento-olimpico': 'Levantamento olímpico',
  pliometria: 'Pliometria',
  powerlifting: 'Powerlifting',
  forca: 'Força',
  alongamento: 'Alongamento',
  strongman: 'Strongman',
  // Legacy EN values for backwards compatibility
  'olympic weightlifting': 'Levantamento olímpico',
  plyometrics: 'Pliometria',
  strength: 'Força',
  stretching: 'Alongamento',
};

const FORCE_PT: Record<string, string> = {
  pull: 'Puxar',
  push: 'Empurrar',
  static: 'Estático',
};

const MECHANIC_PT: Record<string, string> = {
  composto: 'Composto',
  isolado: 'Isolado',
  // Legacy EN values for backwards compatibility
  compound: 'Composto',
  isolation: 'Isolado',
};

export function labelCategory(c: string | null): string {
  return c ? (CATEGORY_PT[c] ?? c) : '—';
}

export function labelForce(f: string | null): string {
  if (!f) return '—';
  return FORCE_PT[f] ?? f;
}

export function labelMechanic(m: string | null): string {
  if (!m) return '—';
  return MECHANIC_PT[m] ?? m;
}

export function labelEquipment(e: string | null): string {
  if (!e) return '—';
  if (e === 'other') return 'Outro';
  return e;
}
