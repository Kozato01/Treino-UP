export type UserStats = {
  totalSessions: number;
  totalVolume: number;
  totalWorkouts: number;
  totalSets: number;
  uniqueExercises: number;
  maxDaysInAWeek: number;
  totalGoals: number;
  achievedGoals: number;
  totalMeasurements: number;
  // Saúde/Wearable
  totalStepsDays: number; // dias com dados de passos
  avgDailySteps: number; // média de passos por dia (dias com dados)
  sessionsWithHeartRate: number; // sessões que capturaram FC
  avgSessionHeartRate: number; // FC média em sessões
  maxSessionHeartRate: number; // FC máxima registrada em sessão
  sessionsWithCalories: number; // sessões que capturaram calorias
  totalCaloriesBurned: number; // total de kcal em sessões
};

export type Achievement = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  check: (s: UserStats) => boolean;
  progress: (s: UserStats) => { current: number; target: number };
};

export const ACHIEVEMENTS: Achievement[] = [
  // ── Sessões ──────────────────────────────────────────────
  {
    id: 'first_session',
    emoji: '🔥',
    title: 'Primeira Suada',
    description: 'Complete sua primeira sessão de treino',
    check: (s) => s.totalSessions >= 1,
    progress: (s) => ({ current: Math.min(s.totalSessions, 1), target: 1 }),
  },
  {
    id: 'ten_sessions',
    emoji: '💪',
    title: 'Na Rotina',
    description: '10 sessões completadas',
    check: (s) => s.totalSessions >= 10,
    progress: (s) => ({ current: Math.min(s.totalSessions, 10), target: 10 }),
  },
  {
    id: 'fifty_sessions',
    emoji: '🏆',
    title: 'Dedicado',
    description: '50 sessões completadas',
    check: (s) => s.totalSessions >= 50,
    progress: (s) => ({ current: Math.min(s.totalSessions, 50), target: 50 }),
  },
  {
    id: 'century',
    emoji: '👑',
    title: 'Centenário',
    description: '100 sessões completadas',
    check: (s) => s.totalSessions >= 100,
    progress: (s) => ({ current: Math.min(s.totalSessions, 100), target: 100 }),
  },
  // ── Treinos criados ───────────────────────────────────────
  {
    id: 'first_workout',
    emoji: '📋',
    title: 'Arquiteto',
    description: 'Crie seu primeiro treino',
    check: (s) => s.totalWorkouts >= 1,
    progress: (s) => ({ current: Math.min(s.totalWorkouts, 1), target: 1 }),
  },
  {
    id: 'five_workouts',
    emoji: '📚',
    title: 'Coleção Completa',
    description: '5 treinos diferentes criados',
    check: (s) => s.totalWorkouts >= 5,
    progress: (s) => ({ current: Math.min(s.totalWorkouts, 5), target: 5 }),
  },
  // ── Séries e Volume ───────────────────────────────────────
  {
    id: 'hundred_sets',
    emoji: '🎯',
    title: 'Séries e Mais Séries',
    description: '100 séries completadas',
    check: (s) => s.totalSets >= 100,
    progress: (s) => ({ current: Math.min(s.totalSets, 100), target: 100 }),
  },
  {
    id: 'sets_500',
    emoji: '🔩',
    title: 'Incansável',
    description: '500 séries completadas',
    check: (s) => s.totalSets >= 500,
    progress: (s) => ({ current: Math.min(s.totalSets, 500), target: 500 }),
  },
  {
    id: 'vol_10k',
    emoji: '⚡',
    title: 'Toneladas',
    description: '10.000 kg de volume total levantado',
    check: (s) => s.totalVolume >= 10000,
    progress: (s) => ({ current: Math.min(Math.round(s.totalVolume), 10000), target: 10000 }),
  },
  {
    id: 'vol_50k',
    emoji: '🦁',
    title: 'Força Bruta',
    description: '50.000 kg de volume total levantado',
    check: (s) => s.totalVolume >= 50000,
    progress: (s) => ({ current: Math.min(Math.round(s.totalVolume), 50000), target: 50000 }),
  },
  {
    id: 'vol_100k',
    emoji: '🤖',
    title: 'Máquina',
    description: '100.000 kg de volume total levantado',
    check: (s) => s.totalVolume >= 100000,
    progress: (s) => ({ current: Math.min(Math.round(s.totalVolume), 100000), target: 100000 }),
  },
  // ── Diversidade de exercícios ─────────────────────────────
  {
    id: 'unique_10',
    emoji: '🧭',
    title: 'Explorador',
    description: '10 exercícios diferentes treinados',
    check: (s) => s.uniqueExercises >= 10,
    progress: (s) => ({ current: Math.min(s.uniqueExercises, 10), target: 10 }),
  },
  {
    id: 'unique_30',
    emoji: '🗺️',
    title: 'Catálogo Vivo',
    description: '30 exercícios diferentes treinados',
    check: (s) => s.uniqueExercises >= 30,
    progress: (s) => ({ current: Math.min(s.uniqueExercises, 30), target: 30 }),
  },
  // ── Consistência / Semana ─────────────────────────────────
  {
    id: 'streak_3',
    emoji: '📅',
    title: 'Semana Completa',
    description: 'Treine em 3 dias diferentes em uma mesma semana',
    check: (s) => s.maxDaysInAWeek >= 3,
    progress: (s) => ({ current: Math.min(s.maxDaysInAWeek, 3), target: 3 }),
  },
  {
    id: 'streak_5',
    emoji: '🗓️',
    title: 'Semana Perfeita',
    description: 'Treine em 5 dias diferentes em uma mesma semana',
    check: (s) => s.maxDaysInAWeek >= 5,
    progress: (s) => ({ current: Math.min(s.maxDaysInAWeek, 5), target: 5 }),
  },
  // ── Metas ─────────────────────────────────────────────────
  {
    id: 'first_goal',
    emoji: '🎯',
    title: 'Mira no Alvo',
    description: 'Crie sua primeira meta',
    check: (s) => s.totalGoals >= 1,
    progress: (s) => ({ current: Math.min(s.totalGoals, 1), target: 1 }),
  },
  {
    id: 'goal_achieved',
    emoji: '✅',
    title: 'Meta Batida',
    description: 'Conclua uma meta',
    check: (s) => s.achievedGoals >= 1,
    progress: (s) => ({ current: Math.min(s.achievedGoals, 1), target: 1 }),
  },
  {
    id: 'goals_3',
    emoji: '🏅',
    title: 'Caçador de Metas',
    description: '3 metas concluídas',
    check: (s) => s.achievedGoals >= 3,
    progress: (s) => ({ current: Math.min(s.achievedGoals, 3), target: 3 }),
  },
  // ── Medições corporais ────────────────────────────────────
  {
    id: 'first_measurement',
    emoji: '📏',
    title: 'Ponto Zero',
    description: 'Registre sua primeira medição corporal',
    check: (s) => s.totalMeasurements >= 1,
    progress: (s) => ({ current: Math.min(s.totalMeasurements, 1), target: 1 }),
  },
  {
    id: 'measurements_10',
    emoji: '📊',
    title: 'Rastreador',
    description: '10 medições corporais registradas',
    check: (s) => s.totalMeasurements >= 10,
    progress: (s) => ({ current: Math.min(s.totalMeasurements, 10), target: 10 }),
  },
  // ── Saúde & Wearable ──────────────────────────────────────
  {
    id: 'wearable_connected',
    emoji: '⌚',
    title: 'Conectado',
    description: 'Registre uma sessão com captura de frequência cardíaca',
    check: (s) => s.sessionsWithHeartRate >= 1,
    progress: (s) => ({ current: Math.min(s.sessionsWithHeartRate, 1), target: 1 }),
  },
  {
    id: 'steps_10k',
    emoji: '👟',
    title: 'Dez Mil Passos',
    description: 'Acumule 10.000 passos em um dia',
    check: (s) => s.avgDailySteps >= 10000,
    progress: (s) => ({ current: Math.min(Math.round(s.avgDailySteps), 10000), target: 10000 }),
  },
  {
    id: 'steps_20k',
    emoji: '🚶',
    title: 'Maratonista',
    description: 'Acumule 20.000 passos em um dia',
    check: (s) => s.avgDailySteps >= 20000,
    progress: (s) => ({ current: Math.min(Math.round(s.avgDailySteps), 20000), target: 20000 }),
  },
  {
    id: 'calories_500',
    emoji: '🔥',
    title: 'Queimado',
    description: '500 kcal queimadas em treinos registrados',
    check: (s) => s.totalCaloriesBurned >= 500,
    progress: (s) => ({ current: Math.min(Math.round(s.totalCaloriesBurned), 500), target: 500 }),
  },
  {
    id: 'calories_2k',
    emoji: '🌡️',
    title: 'Forno Ligado',
    description: '2.000 kcal queimadas em treinos registrados',
    check: (s) => s.totalCaloriesBurned >= 2000,
    progress: (s) => ({ current: Math.min(Math.round(s.totalCaloriesBurned), 2000), target: 2000 }),
  },
  {
    id: 'heart_rate_5',
    emoji: '❤️',
    title: 'Cardíaco',
    description: '5 sessões com frequência cardíaca capturada',
    check: (s) => s.sessionsWithHeartRate >= 5,
    progress: (s) => ({ current: Math.min(s.sessionsWithHeartRate, 5), target: 5 }),
  },
  {
    id: 'active_5days',
    emoji: '📈',
    title: 'Semana Ativa',
    description: '5 dias com registro de passos',
    check: (s) => s.totalStepsDays >= 5,
    progress: (s) => ({ current: Math.min(s.totalStepsDays, 5), target: 5 }),
  },
];

export function computeStats(
  sessions: { id: number; endedAt: number | null; startedAt: number; avgHeartRateBpm?: number | null; maxHeartRateBpm?: number | null; caloriesBurned?: number | null }[],
  sessionSets: { sessionId: number; reps: number | null; weightKg: number | null; completed: boolean; exerciseId: string }[],
  workouts: { id: number }[],
  goals: { achieved: boolean }[],
  bodyMeasurements: { id: number }[],
  dailyMetrics?: { date: string; steps?: number }[]
): UserStats {
  const completedSessions = sessions.filter((s) => s.endedAt != null);
  const completedSessionIds = new Set(completedSessions.map((s) => s.id));
  const completedSets = sessionSets.filter((ss) => ss.completed && completedSessionIds.has(ss.sessionId));

  const totalVolume = completedSets.reduce((acc, ss) => acc + (ss.reps ?? 0) * (ss.weightKg ?? 0), 0);

  // Exercícios únicos treinados
  const uniqueExercises = new Set(completedSets.map((ss) => ss.exerciseId)).size;

  // Máximo de dias de treino em uma mesma semana (semana começa na segunda)
  const daysByWeek = new Map<string, Set<string>>();
  for (const s of completedSessions) {
    const d = new Date(s.startedAt);
    const dayOfWeek = d.getDay(); // 0 = dom
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
    const weekKey = monday.toISOString().slice(0, 10);
    const dayKey = d.toISOString().slice(0, 10);
    if (!daysByWeek.has(weekKey)) daysByWeek.set(weekKey, new Set());
    daysByWeek.get(weekKey)!.add(dayKey);
  }
  const maxDaysInAWeek = daysByWeek.size === 0 ? 0 : Math.max(...[...daysByWeek.values()].map((s) => s.size));

  // Health/Wearable metrics
  const sessionsWithHeartRate = completedSessions.filter((s) => s.avgHeartRateBpm != null).length;
  let totalHeartRateSum = 0;
  let maxHeartRate = 0;
  for (const s of completedSessions) {
    if (s.avgHeartRateBpm != null) totalHeartRateSum += s.avgHeartRateBpm;
    if (s.maxHeartRateBpm != null && s.maxHeartRateBpm > maxHeartRate) maxHeartRate = s.maxHeartRateBpm;
  }
  const avgSessionHeartRate = sessionsWithHeartRate > 0 ? Math.round(totalHeartRateSum / sessionsWithHeartRate) : 0;

  const sessionsWithCalories = completedSessions.filter((s) => s.caloriesBurned != null && s.caloriesBurned > 0).length;
  const totalCaloriesBurned = completedSessions.reduce((acc, s) => acc + (s.caloriesBurned ?? 0), 0);

  // Daily steps from Health Connect
  const daysWithSteps = (dailyMetrics ?? []).filter((m) => m.steps != null && m.steps > 0).length;
  const totalSteps = (dailyMetrics ?? []).reduce((acc, m) => acc + (m.steps ?? 0), 0);
  const avgDailySteps = daysWithSteps > 0 ? Math.round(totalSteps / daysWithSteps) : 0;

  return {
    totalSessions: completedSessions.length,
    totalVolume,
    totalWorkouts: workouts.length,
    totalSets: completedSets.length,
    uniqueExercises,
    maxDaysInAWeek,
    totalGoals: goals.length,
    achievedGoals: goals.filter((g) => g.achieved).length,
    totalMeasurements: bodyMeasurements.length,
    totalStepsDays: daysWithSteps,
    avgDailySteps,
    sessionsWithHeartRate,
    avgSessionHeartRate,
    maxSessionHeartRate: maxHeartRate,
    sessionsWithCalories,
    totalCaloriesBurned: Math.round(totalCaloriesBurned),
  };
}
