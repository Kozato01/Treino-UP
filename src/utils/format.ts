export function formatWeight(kg: number | null | undefined, unit: 'kg' | 'lb' = 'kg'): string {
  if (kg == null) return '—';
  if (unit === 'lb') {
    return `${(kg * 2.2046).toFixed(1)} lb`;
  }
  return `${kg.toFixed(kg % 1 === 0 ? 0 : 1)} kg`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (s === 0) return `${m}min`;
  return `${m}min ${s}s`;
}

export function formatMMSS(totalSeconds: number): string {
  const abs = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatDate(d: Date | number | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'number' ? new Date(d) : d;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(d: Date | number | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'number' ? new Date(d) : d;
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

// Epley formula — estimated 1-rep max
export function estimated1RM(weightKg: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

/**
 * Formata volume (em kg) com separador de milhar PT-BR.
 * Ex: 234 → "234 kg" · 12500 → "12.500 kg" · 0 → "0 kg"
 */
export function formatVolumeKg(kg: number): string {
  if (!isFinite(kg) || kg < 0) return '0 kg';
  const rounded = Math.round(kg);
  return `${rounded.toLocaleString('pt-BR')} kg`;
}

/**
 * Formata volume em toneladas para grandes acumulados.
 * Ex: 0 → "0 kg" · 850 → "850 kg" · 1500 → "1,5 t" · 12500 → "12,5 t"
 */
export function formatTonnage(kg: number): string {
  if (!isFinite(kg) || kg <= 0) return '0 kg';
  if (kg < 1000) return `${Math.round(kg)} kg`;
  const tons = kg / 1000;
  return `${tons.toFixed(1).replace('.', ',')} t`;
}

export function startOfWeek(d: Date): Date {
  const out = new Date(d);
  const day = out.getDay();
  const diff = out.getDate() - day + (day === 0 ? -6 : 1);
  out.setDate(diff);
  out.setHours(0, 0, 0, 0);
  return out;
}
