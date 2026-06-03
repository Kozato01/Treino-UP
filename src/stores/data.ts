import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getExerciseById } from '../data/exercises';
import { TEMPLATES } from '../data/templates';
import { PACKAGES } from '../data/routines';
import { MEAL_PLAN, type Meal } from '../data/mealPlan';
import { startOfWeek } from '../utils/format';
import type {
  BodyMeasurement,
  DailyMetrics,
  Goal,
  Session,
  SessionSet,
  Weekday,
  Workout,
  WorkoutExercise,
  WorkoutPack,
} from '../types';

// === Helpers exportados para metas ===

// Calcula o currentValue derivado de uma meta a partir das sessões/séries existentes.
// - frequency: sessões concluídas na semana corrente.
// - weight: maior weightKg registrado para o exerciseId da meta (todas as sessões).
// - volume: soma de reps*weightKg na semana corrente.
export function computeGoalProgress(
  goal: Pick<Goal, 'type' | 'exerciseId'>,
  sessions: Session[],
  sessionSets: SessionSet[],
): number {
  if (goal.type === 'frequency') {
    const weekStart = startOfWeek(new Date()).getTime();
    return sessions.filter((s) => s.endedAt != null && s.startedAt >= weekStart).length;
  }
  if (goal.type === 'weight') {
    if (!goal.exerciseId) return 0;
    let max = 0;
    for (const ss of sessionSets) {
      if (ss.exerciseId !== goal.exerciseId) continue;
      if (ss.weightKg != null && ss.weightKg > max) max = ss.weightKg;
    }
    return max;
  }
  if (goal.type === 'volume') {
    const weekStart = startOfWeek(new Date()).getTime();
    const weekSessionIds = new Set(
      sessions.filter((s) => s.startedAt >= weekStart).map((s) => s.id),
    );
    let total = 0;
    for (const ss of sessionSets) {
      if (!weekSessionIds.has(ss.sessionId)) continue;
      total += (ss.reps ?? 0) * (ss.weightKg ?? 0);
    }
    return total;
  }
  return 0;
}

// Helper interno: aplica recomputeGoals em todas as metas do estado dado.
function applyRecomputeGoals(state: { goals: Goal[]; sessions: Session[]; sessionSets: SessionSet[] }): Goal[] {
  return state.goals.map((g) => {
    const currentValue = computeGoalProgress(g, state.sessions, state.sessionSets);
    // Mantém achieved=true se já foi marcado manualmente; senão, baseia em target.
    const achieved = g.achieved || currentValue >= g.targetValue;
    return { ...g, currentValue, achieved };
  });
}

// Formato YYYY-MM-DD de uma data local.
export function toIsoDay(d: Date | number): string {
  const date = typeof d === 'number' ? new Date(d) : d;
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type NextIds = {
  workout: number;
  workoutExercise: number;
  session: number;
  sessionSet: number;
  goal: number;
  bodyMeasurement: number;
  workoutPack: number;
};

type DataState = {
  hydrated: boolean;
  seeded: boolean;
  workouts: Workout[];
  workoutExercises: WorkoutExercise[];
  sessions: Session[];
  sessionSets: SessionSet[];
  goals: Goal[];
  bodyMeasurements: BodyMeasurement[];
  workoutPacks: WorkoutPack[];
  dailyMetrics: DailyMetrics[];
  activePackId: number | null;
  skippedDates: string[]; // YYYY-MM-DD — dias que o usuário marcou como descanso.
  meals: Meal[];
  nextIds: NextIds;
};

type DataActions = {
  seedIfEmpty: () => void;
  replaceAll: (data: Partial<Omit<DataState, 'hydrated' | 'seeded' | 'nextIds'>>) => void;
  wipeUserData: () => void;

  addWorkout: (input: { name: string; description: string | null; color: string | null }) => number;
  updateWorkout: (id: number, patch: Partial<Omit<Workout, 'id' | 'createdAt'>>) => void;
  deleteWorkout: (id: number) => void;

  addWorkoutExercise: (input: Omit<WorkoutExercise, 'id'>) => number;
  updateWorkoutExercise: (id: number, patch: Partial<Omit<WorkoutExercise, 'id'>>) => void;
  deleteWorkoutExercise: (id: number) => void;
  reorderWorkoutExercises: (workoutId: number, orderedIds: number[]) => void;

  addSession: (input: { workoutId: number | null; workoutName: string }) => number;
  updateSession: (id: number, patch: Partial<Omit<Session, 'id' | 'startedAt' | 'workoutId' | 'workoutName'>>) => void;
  deleteSession: (id: number) => void;

  addSessionSet: (input: Omit<SessionSet, 'id'>) => number;

  addGoal: (input: Omit<Goal, 'id' | 'createdAt' | 'currentValue' | 'achieved'>) => number;
  updateGoal: (id: number, patch: Partial<Omit<Goal, 'id' | 'createdAt'>>) => void;
  deleteGoal: (id: number) => void;

  addBodyMeasurement: (input: Omit<BodyMeasurement, 'id'>) => number;
  deleteBodyMeasurement: (id: number) => void;

  importWorkout: (workout: Omit<Workout, 'id'>, exercises: Omit<WorkoutExercise, 'id' | 'workoutId'>[]) => number;

  addWorkoutPack: (input: Omit<WorkoutPack, 'id' | 'createdAt'>) => number;
  updateWorkoutPack: (id: number, patch: Partial<Omit<WorkoutPack, 'id' | 'createdAt'>>) => void;
  deleteWorkoutPack: (id: number) => void;
  setActivePack: (id: number | null) => void;
  importPack: (input: {
    pack: { name: string; description: string | null; assignments: Partial<Record<Weekday, number>> };
    workouts: { workout: Omit<Workout, 'id'>; exercises: Omit<WorkoutExercise, 'id' | 'workoutId'>[] }[];
  }) => number;

  recomputeGoals: () => void;
  skipDate: (isoDay: string) => void;
  unskipDate: (isoDay: string) => void;

  upsertDailyMetrics: (metric: Partial<DailyMetrics> & { date: string }) => void;

  addMeal: (input: Omit<Meal, 'id'>) => void;
  deleteMeal: (id: string) => void;
};

const INITIAL: DataState = {
  hydrated: false,
  seeded: false,
  workouts: [],
  workoutExercises: [],
  sessions: [],
  sessionSets: [],
  goals: [],
  bodyMeasurements: [],
  workoutPacks: [],
  dailyMetrics: [],
  activePackId: null,
  skippedDates: [],
  meals: MEAL_PLAN,
  nextIds: {
    workout: 1,
    workoutExercise: 1,
    session: 1,
    sessionSet: 1,
    goal: 1,
    bodyMeasurement: 1,
    workoutPack: 1,
  },
};

export const useData = create<DataState & DataActions>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      seedIfEmpty: () => {
        const s = get();
        if (s.seeded || s.workouts.length > 0) {
          if (!s.seeded) set({ seeded: true });
          return;
        }
        const workouts: Workout[] = [];
        const workoutExercises: WorkoutExercise[] = [];
        const nextIds = { ...s.nextIds };
        const now = Date.now();
        for (const tpl of TEMPLATES) {
          const workoutId = nextIds.workout++;
          workouts.push({
            id: workoutId,
            name: tpl.name,
            description: tpl.description,
            color: tpl.color,
            createdAt: now,
          });
          tpl.exercises.forEach((ex, idx) => {
            if (!getExerciseById(ex.exerciseId)) return;
            workoutExercises.push({
              id: nextIds.workoutExercise++,
              workoutId,
              exerciseId: ex.exerciseId,
              orderIndex: idx,
              targetSets: ex.sets,
              targetReps: ex.reps,
              targetWeightKg: null,
              restSeconds: ex.restSeconds,
              notes: null,
              technique: 'normal',
            });
          });
        }

        // Create workout packs (groups of related workouts) with real assignments
        const workoutsByName = new Map<string, number>();
        for (const w of workouts) workoutsByName.set(w.name, w.id);

        const workoutPacks: WorkoutPack[] = [];
        for (const pkg of PACKAGES) {
          const packId = nextIds.workoutPack++;
          const assignments: WorkoutPack['assignments'] = {};
          for (const [day, workoutName] of Object.entries(pkg.assignments) as [Weekday, string][]) {
            const wid = workoutsByName.get(workoutName);
            if (wid != null) assignments[day] = wid;
          }
          workoutPacks.push({
            id: packId,
            name: pkg.name,
            description: pkg.description,
            assignments,
            createdAt: now,
          });
        }

        set({ workouts, workoutExercises, workoutPacks, nextIds, seeded: true });
      },

      replaceAll: (data) => {
        set((s) => {
          const workouts = data.workouts ?? s.workouts;
          const workoutExercises = data.workoutExercises ?? s.workoutExercises;
          const sessions = data.sessions ?? s.sessions;
          const sessionSets = data.sessionSets ?? s.sessionSets;
          const goals = data.goals ?? s.goals;
          const bodyMeasurements = data.bodyMeasurements ?? s.bodyMeasurements;
          const workoutPacks = data.workoutPacks ?? s.workoutPacks;
          const activePackId = data.activePackId ?? s.activePackId;
          const skippedDates = data.skippedDates ?? s.skippedDates;
          const nextIds = {
            workout: Math.max(0, ...workouts.map((w) => w.id)) + 1,
            workoutExercise: Math.max(0, ...workoutExercises.map((w) => w.id)) + 1,
            session: Math.max(0, ...sessions.map((w) => w.id)) + 1,
            sessionSet: Math.max(0, ...sessionSets.map((w) => w.id)) + 1,
            goal: Math.max(0, ...goals.map((w) => w.id)) + 1,
            bodyMeasurement: Math.max(0, ...bodyMeasurements.map((w) => w.id)) + 1,
            workoutPack: Math.max(0, ...workoutPacks.map((w) => w.id)) + 1,
          };
          return {
            workouts,
            workoutExercises,
            sessions,
            sessionSets,
            goals,
            bodyMeasurements,
            workoutPacks,
            activePackId,
            skippedDates,
            nextIds,
          };
        });
      },

      wipeUserData: () =>
        set({
          workouts: [],
          workoutExercises: [],
          sessions: [],
          sessionSets: [],
          goals: [],
          bodyMeasurements: [],
          workoutPacks: [],
          activePackId: null,
          skippedDates: [],
          nextIds: { ...INITIAL.nextIds },
          seeded: false,
        }),

      addWorkout: ({ name, description, color }) => {
        const id = get().nextIds.workout;
        set((s) => ({
          workouts: [
            ...s.workouts,
            { id, name, description, color, createdAt: Date.now() },
          ],
          nextIds: { ...s.nextIds, workout: id + 1 },
        }));
        return id;
      },

      updateWorkout: (id, patch) =>
        set((s) => ({
          workouts: s.workouts.map((w) => (w.id === id ? { ...w, ...patch } : w)),
        })),

      deleteWorkout: (id) =>
        set((s) => ({
          workouts: s.workouts.filter((w) => w.id !== id),
          workoutExercises: s.workoutExercises.filter((we) => we.workoutId !== id),
          workoutPacks: s.workoutPacks.map((p) => {
            const assignments = { ...p.assignments };
            for (const wd of Object.keys(assignments) as Weekday[]) {
              if (assignments[wd] === id) delete assignments[wd];
            }
            return { ...p, assignments };
          }),
        })),

      addWorkoutExercise: (input) => {
        const id = get().nextIds.workoutExercise;
        set((s) => ({
          workoutExercises: [...s.workoutExercises, { id, ...input }],
          nextIds: { ...s.nextIds, workoutExercise: id + 1 },
        }));
        return id;
      },

      updateWorkoutExercise: (id, patch) =>
        set((s) => ({
          workoutExercises: s.workoutExercises.map((we) =>
            we.id === id ? { ...we, ...patch } : we
          ),
        })),

      deleteWorkoutExercise: (id) =>
        set((s) => ({ workoutExercises: s.workoutExercises.filter((we) => we.id !== id) })),

      reorderWorkoutExercises: (workoutId, orderedIds) =>
        set((s) => ({
          workoutExercises: s.workoutExercises.map((we) => {
            if (we.workoutId !== workoutId) return we;
            const idx = orderedIds.indexOf(we.id);
            return idx >= 0 ? { ...we, orderIndex: idx } : we;
          }),
        })),

      addSession: ({ workoutId, workoutName }) => {
        const id = get().nextIds.session;
        set((s) => ({
          sessions: [
            ...s.sessions,
            { id, workoutId, workoutName, startedAt: Date.now(), endedAt: null, notes: null },
          ],
          nextIds: { ...s.nextIds, session: id + 1 },
        }));
        return id;
      },

      updateSession: (id, patch) =>
        set((s) => {
          const sessions = s.sessions.map((se) => (se.id === id ? { ...se, ...patch } : se));
          // Se a sessão foi finalizada (endedAt setado), recalcula metas.
          const finished = patch.endedAt != null;
          return finished
            ? { sessions, goals: applyRecomputeGoals({ ...s, sessions }) }
            : { sessions };
        }),

      deleteSession: (id) =>
        set((s) => {
          const sessions = s.sessions.filter((se) => se.id !== id);
          const sessionSets = s.sessionSets.filter((ss) => ss.sessionId !== id);
          return {
            sessions,
            sessionSets,
            goals: applyRecomputeGoals({ ...s, sessions, sessionSets }),
          };
        }),

      addSessionSet: (input) => {
        const id = get().nextIds.sessionSet;
        set((s) => {
          const sessionSets = [...s.sessionSets, { id, ...input }];
          return {
            sessionSets,
            nextIds: { ...s.nextIds, sessionSet: id + 1 },
            goals: applyRecomputeGoals({ ...s, sessionSets }),
          };
        });
        return id;
      },

      addGoal: (input) => {
        const id = get().nextIds.goal;
        set((s) => {
          // Calcula o valor inicial baseado no histórico (PRs anteriores, sessões da semana, etc).
          // Achieved fica false na criação: usuário marca manualmente quando quiser fechar a meta.
          const initialValue = computeGoalProgress(
            { type: input.type, exerciseId: input.exerciseId },
            s.sessions,
            s.sessionSets,
          );
          return {
            goals: [
              ...s.goals,
              {
                id,
                ...input,
                currentValue: initialValue,
                achieved: false,
                createdAt: Date.now(),
              },
            ],
            nextIds: { ...s.nextIds, goal: id + 1 },
          };
        });
        return id;
      },

      updateGoal: (id, patch) =>
        set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),

      deleteGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),

      addBodyMeasurement: (input) => {
        const id = get().nextIds.bodyMeasurement;
        set((s) => ({
          bodyMeasurements: [...s.bodyMeasurements, { id, ...input }],
          nextIds: { ...s.nextIds, bodyMeasurement: id + 1 },
        }));
        return id;
      },

      deleteBodyMeasurement: (id) =>
        set((s) => ({ bodyMeasurements: s.bodyMeasurements.filter((b) => b.id !== id) })),

      importWorkout: (workoutInput, exercises) => {
        const workoutId = get().nextIds.workout;
        const weStartId = get().nextIds.workoutExercise;
        const newExercises: WorkoutExercise[] = exercises.map((ex, i) => ({
          ...ex,
          id: weStartId + i,
          workoutId,
        }));
        set((s) => ({
          workouts: [...s.workouts, { ...workoutInput, id: workoutId }],
          workoutExercises: [...s.workoutExercises, ...newExercises],
          nextIds: {
            ...s.nextIds,
            workout: workoutId + 1,
            workoutExercise: weStartId + newExercises.length,
          },
        }));
        return workoutId;
      },

      addWorkoutPack: (input) => {
        const id = get().nextIds.workoutPack;
        set((s) => ({
          workoutPacks: [
            ...s.workoutPacks,
            { id, name: input.name, description: input.description, assignments: input.assignments, createdAt: Date.now() },
          ],
          nextIds: { ...s.nextIds, workoutPack: id + 1 },
        }));
        return id;
      },

      updateWorkoutPack: (id, patch) =>
        set((s) => ({
          workoutPacks: s.workoutPacks.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),

      deleteWorkoutPack: (id) =>
        set((s) => ({
          workoutPacks: s.workoutPacks.filter((p) => p.id !== id),
          activePackId: s.activePackId === id ? null : s.activePackId,
        })),

      setActivePack: (id) => set({ activePackId: id }),

      recomputeGoals: () =>
        set((s) => ({ goals: applyRecomputeGoals(s) })),

      skipDate: (isoDay) =>
        set((s) => (s.skippedDates.includes(isoDay) ? s : { skippedDates: [...s.skippedDates, isoDay] })),

      unskipDate: (isoDay) =>
        set((s) => ({ skippedDates: s.skippedDates.filter((d) => d !== isoDay) })),

      importPack: ({ pack, workouts }) => {
        const createdIds: number[] = [];
        for (const w of workouts) {
          const newId = get().importWorkout(w.workout, w.exercises);
          createdIds.push(newId);
        }
        const remapped: Partial<Record<Weekday, number>> = {};
        for (const [wd, idx] of Object.entries(pack.assignments) as [Weekday, number | undefined][]) {
          if (typeof idx !== 'number' || idx < 0 || idx >= createdIds.length) continue;
          remapped[wd] = createdIds[idx];
        }
        const packId = get().nextIds.workoutPack;
        set((s) => ({
          workoutPacks: [
            ...s.workoutPacks,
            { id: packId, name: pack.name, description: pack.description, assignments: remapped, createdAt: Date.now(), isImported: true },
          ],
          nextIds: { ...s.nextIds, workoutPack: packId + 1 },
        }));
        return packId;
      },

      upsertDailyMetrics: (metric) =>
        set((s) => {
          const existingIdx = s.dailyMetrics.findIndex((m) => m.date === metric.date);
          if (existingIdx >= 0) {
            const updated = [...s.dailyMetrics];
            updated[existingIdx] = { ...updated[existingIdx], ...metric };
            return { dailyMetrics: updated };
          }
          return { dailyMetrics: [...s.dailyMetrics, metric as DailyMetrics] };
        }),

      addMeal: (input) =>
        set((s) => ({
          meals: [...s.meals, { id: Date.now().toString(), ...input }],
        })),

      deleteMeal: (id) =>
        set((s) => ({ meals: s.meals.filter((m) => m.id !== id) })),
    }),
    {
      name: 'academia-data',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        workouts: s.workouts,
        workoutExercises: s.workoutExercises,
        sessions: s.sessions,
        sessionSets: s.sessionSets,
        goals: s.goals,
        bodyMeasurements: s.bodyMeasurements,
        workoutPacks: s.workoutPacks,
        dailyMetrics: s.dailyMetrics,
        activePackId: s.activePackId,
        skippedDates: s.skippedDates,
        meals: s.meals,
        nextIds: s.nextIds,
        seeded: s.seeded,
      }),
      onRehydrateStorage: () => (state) => {
        state?.seedIfEmpty();
        useData.setState({ hydrated: true });
      },
    }
  )
);
