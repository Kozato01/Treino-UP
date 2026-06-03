import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { SetTechnique } from '../types';

export type ActiveSet = {
  setNumber: number;
  targetReps: number;
  targetWeightKg: number | null;
  reps: number | null;
  weightKg: number | null;
  rpe: number | null;
  technique: SetTechnique;
  completed: boolean;
};

export type ActiveExercise = {
  exerciseId: string;
  exerciseName: string;
  orderIndex: number;
  restSeconds: number;
  sets: ActiveSet[];
  notes: string;
};

type SessionState = {
  sessionId: number | null;
  workoutId: number | null;
  workoutName: string;
  startedAt: number | null; // epoch ms
  exercises: ActiveExercise[];
  restEndsAt: number | null; // epoch ms
  start: (params: {
    sessionId: number;
    workoutId: number | null;
    workoutName: string;
    exercises: ActiveExercise[];
  }) => void;
  updateSet: (exerciseIdx: number, setIdx: number, patch: Partial<ActiveSet>) => void;
  completeSet: (exerciseIdx: number, setIdx: number) => void;
  addSetToExercise: (exerciseIdx: number) => void;
  setNotes: (exerciseIdx: number, notes: string) => void;
  startRest: (seconds: number) => void;
  clearRest: () => void;
  finish: () => void;
  reset: () => void;
};

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
  sessionId: null,
  workoutId: null,
  workoutName: '',
  startedAt: null,
  exercises: [],
  restEndsAt: null,

  start: ({ sessionId, workoutId, workoutName, exercises }) =>
    set({
      sessionId,
      workoutId,
      workoutName,
      startedAt: Date.now(),
      exercises,
      restEndsAt: null,
    }),

  updateSet: (exerciseIdx, setIdx, patch) => {
    const exercises = [...get().exercises];
    const ex = { ...exercises[exerciseIdx] };
    ex.sets = ex.sets.map((s, i) => (i === setIdx ? { ...s, ...patch } : s));
    exercises[exerciseIdx] = ex;
    set({ exercises });
  },

  completeSet: (exerciseIdx, setIdx) => {
    const { exercises } = get();
    const ex = exercises[exerciseIdx];
    const s = ex.sets[setIdx];
    get().updateSet(exerciseIdx, setIdx, {
      completed: true,
      reps: s.reps ?? s.targetReps,
      weightKg: s.weightKg ?? s.targetWeightKg ?? 0,
    });
    get().startRest(ex.restSeconds);
  },

  addSetToExercise: (exerciseIdx) => {
    const exercises = [...get().exercises];
    const ex = { ...exercises[exerciseIdx] };
    const lastSet = ex.sets[ex.sets.length - 1];
    ex.sets = [
      ...ex.sets,
      {
        setNumber: ex.sets.length + 1,
        targetReps: lastSet?.targetReps ?? 10,
        targetWeightKg: lastSet?.targetWeightKg ?? null,
        reps: null,
        weightKg: lastSet?.weightKg ?? null,
        rpe: null,
        technique: 'normal',
        completed: false,
      },
    ];
    exercises[exerciseIdx] = ex;
    set({ exercises });
  },

  setNotes: (exerciseIdx, notes) => {
    const exercises = [...get().exercises];
    exercises[exerciseIdx] = { ...exercises[exerciseIdx], notes };
    set({ exercises });
  },

  startRest: (seconds) => set({ restEndsAt: Date.now() + seconds * 1000 }),
  clearRest: () => set({ restEndsAt: null }),

  finish: () =>
    set({
      sessionId: null,
      workoutId: null,
      workoutName: '',
      startedAt: null,
      exercises: [],
      restEndsAt: null,
    }),

  reset: () =>
    set({
      sessionId: null,
      workoutId: null,
      workoutName: '',
      startedAt: null,
      exercises: [],
      restEndsAt: null,
    }),
    }),
    {
      name: 'academia-session',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
