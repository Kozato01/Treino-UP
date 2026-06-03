export type Exercise = {
  id: string;
  name: string;
  namePt: string | null;
  force: string | null;
  level: string;
  mechanic: string | null;
  equipment: string | null;
  category: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  images: string[];
};

export type Workout = {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  createdAt: number;
  isImported?: boolean;
};

export type WorkoutExercise = {
  id: number;
  workoutId: number;
  exerciseId: string;
  orderIndex: number;
  targetSets: number;
  targetReps: number;
  targetWeightKg: number | null;
  restSeconds: number;
  notes: string | null;
  technique: SetTechnique;
};

export type Session = {
  id: number;
  workoutId: number | null;
  workoutName: string;
  startedAt: number;
  endedAt: number | null;
  notes: string | null;
  avgHeartRateBpm?: number | null;
  maxHeartRateBpm?: number | null;
  caloriesBurned?: number | null;
};

export type SetTechnique = 'normal' | 'warmup' | 'dropset' | 'isometric';

export type SessionSet = {
  id: number;
  sessionId: number;
  exerciseId: string;
  exerciseOrder: number;
  setNumber: number;
  reps: number | null;
  targetReps: number | null;
  weightKg: number | null;
  rpe: number | null;
  technique: SetTechnique;
  completed: boolean;
  completedAt: number | null;
};

export type GoalType = 'weight' | 'frequency' | 'volume';

export type Goal = {
  id: number;
  type: GoalType;
  exerciseId: string | null;
  targetValue: number;
  currentValue: number;
  deadline: number | null;
  achieved: boolean;
  notes: string | null;
  createdAt: number;
};

export type BodyMeasurement = {
  id: number;
  date: number;
  weightKg: number | null;
  bodyFatPct: number | null;
  // Circunferências em centímetros (todas opcionais)
  chestCm?: number | null;
  waistCm?: number | null;
  hipCm?: number | null;
  armCm?: number | null;
  thighCm?: number | null;
  calfCm?: number | null;
  notes: string | null;
};

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: 'SEG',
  tue: 'TER',
  wed: 'QUA',
  thu: 'QUI',
  fri: 'SEX',
  sat: 'SÁB',
  sun: 'DOM',
};

export type WorkoutPack = {
  id: number;
  name: string;
  description: string | null;
  assignments: Partial<Record<Weekday, number>>;
  createdAt: number;
  isImported?: boolean;
};

export type TimedActivityType = 'aquecimento' | 'cardio';

export type TimedActivity = {
  id: number;
  type: TimedActivityType;
  durationMinutes: number;
  startedAt: number;
  notes: string | null;
  routeId?: string; // id da rota GPS gravada (useRoutes), quando houver
};

export type DailyMetrics = {
  date: string; // YYYY-MM-DD
  steps?: number;
  activeCalories?: number;
  restingHeartRate?: number;
  sleepMinutes?: number;
  spO2?: number; // Oxygen saturation %
  vo2Max?: number; // VO2 Max in ml/min/kg
  hrv?: number; // Heart rate variability in milliseconds
  stressLevel?: number; // 0-100 or enum
  bodyFatPct?: number; // Body fat percentage
  latestWeightKg?: number;
  latestBodyFatPct?: number;
  latestSpO2?: number;
  source: 'health_connect';
  syncedAt: number;
};

export type RouteLocation = {
  lat: number;
  lng: number;
  altitude?: number;
  timestamp: string;
};
