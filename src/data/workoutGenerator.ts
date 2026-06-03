import { searchExercises } from './exercises';

export const MUSCLE_GROUPS = [
  { id: 'peito', label: 'Peito' },
  { id: 'dorsais', label: 'Costas' },
  { id: 'meio-das-costas', label: 'Meio das costas' },
  { id: 'inferior-das-costas', label: 'Lombar' },
  { id: 'ombros', label: 'Ombros' },
  { id: 'biceps', label: 'Bíceps' },
  { id: 'triceps', label: 'Tríceps' },
  { id: 'antebracos', label: 'Antebraços' },
  { id: 'pernas', label: 'Pernas' },
  { id: 'quadriceps', label: 'Quadríceps' },
  { id: 'isquiotibiais', label: 'Posteriores' },
  { id: 'gluteos', label: 'Glúteos' },
  { id: 'abdominais', label: 'Abdômen' },
  { id: 'panturrilhas', label: 'Panturrilhas' },
  { id: 'trapezio', label: 'Trapézios' },
  { id: 'abdutores', label: 'Abdutores' },
  { id: 'adutores', label: 'Adutores' },
  { id: 'pescoco', label: 'Pescoço' },
];

export const MUSCLE_GROUP_EXPANSION: Record<string, string[]> = {
  pernas: ['quadriceps', 'isquiotibiais', 'gluteos', 'panturrilhas', 'abdutores', 'adutores'],
};

export type WorkoutLevel = 'beginner' | 'intermediate' | 'advanced';

export const LEVEL_LABELS: Record<WorkoutLevel, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};

const LEVEL_PARAMS: Record<WorkoutLevel, { sets: number; reps: number; rest: number; count: number }> = {
  beginner:     { sets: 3, reps: 12, rest: 60,  count: 4 },
  intermediate: { sets: 4, reps: 10, rest: 90,  count: 5 },
  advanced:     { sets: 5, reps: 6,  rest: 120, count: 6 },
};

export type GeneratedExercise = {
  exerciseId: string;
  exerciseName: string;
  orderIndex: number;
  targetSets: number;
  targetReps: number;
  targetWeightKg: null;
  restSeconds: number;
  notes: null;
  technique: 'normal';
};

function shuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function generateWorkout(muscles: string[], level: WorkoutLevel, seed = Date.now()): GeneratedExercise[] {
  const params = LEVEL_PARAMS[level];
  const candidates = searchExercises('', muscles).filter(
    (e) => e.category === 'forca' || e.category === 'powerlifting'
  );

  const compounds = candidates.filter((e) => e.mechanic === 'composto');
  const isolations = candidates.filter((e) => e.mechanic !== 'composto');

  const shuffledCompounds = shuffle(compounds, seed);
  const shuffledIsolations = shuffle(isolations, seed + 1);

  const picked: typeof candidates = [];
  const compoundTarget = Math.ceil(params.count * 0.6);
  picked.push(...shuffledCompounds.slice(0, compoundTarget));
  const remaining = params.count - picked.length;
  picked.push(...shuffledIsolations.slice(0, remaining));

  // Fill with any remaining if not enough
  if (picked.length < params.count) {
    const extra = shuffle(candidates, seed + 2).filter((e) => !picked.includes(e));
    picked.push(...extra.slice(0, params.count - picked.length));
  }

  return picked.slice(0, params.count).map((ex, idx) => ({
    exerciseId: ex.id,
    exerciseName: ex.namePt ?? ex.name,
    orderIndex: idx,
    targetSets: params.sets,
    targetReps: params.reps,
    targetWeightKg: null,
    restSeconds: params.rest,
    notes: null,
    technique: 'normal' as const,
  }));
}

export function pickReplacement(
  muscles: string[],
  level: WorkoutLevel,
  excludeIds: string[],
  seed = Date.now(),
): GeneratedExercise | null {
  const params = LEVEL_PARAMS[level];
  const candidates = searchExercises('', muscles).filter(
    (e) =>
      (e.category === 'forca' || e.category === 'powerlifting') &&
      !excludeIds.includes(e.id)
  );
  if (candidates.length === 0) return null;
  const picked = shuffle(candidates, seed)[0];
  return {
    exerciseId: picked.id,
    exerciseName: picked.namePt ?? picked.name,
    orderIndex: 0,
    targetSets: params.sets,
    targetReps: params.reps,
    targetWeightKg: null,
    restSeconds: params.rest,
    notes: null,
    technique: 'normal' as const,
  };
}

export function buildWorkoutName(muscles: string[]): string {
  const labels = muscles
    .map((m) => MUSCLE_GROUPS.find((g) => g.id === m)?.label ?? m)
    .slice(0, 3);
  return labels.join(' + ');
}
