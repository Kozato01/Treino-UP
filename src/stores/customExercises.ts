import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Exercise } from '../types';

export type CustomExerciseInput = {
  name: string;
  primaryMuscle: string;
  equipment: string;
};

type State = {
  customs: Exercise[];
  nextId: number;
  addCustom: (input: CustomExerciseInput) => string;
  deleteCustom: (id: string) => void;
};

export const useCustomExercises = create<State>()(
  persist(
    (set, get) => ({
      customs: [],
      nextId: 1,
      addCustom: ({ name, primaryMuscle, equipment }) => {
        const n = get().nextId;
        const id = `custom-${n}`;
        const newEx: Exercise = {
          id,
          name: name.trim(),
          namePt: name.trim(),
          force: null,
          level: 'intermediate',
          mechanic: null,
          equipment: equipment.trim() || null,
          category: 'strength',
          primaryMuscles: [primaryMuscle],
          secondaryMuscles: [],
          instructions: [],
          images: [],
        };
        set((s) => ({ customs: [...s.customs, newEx], nextId: n + 1 }));
        return id;
      },
      deleteCustom: (id) =>
        set((s) => ({ customs: s.customs.filter((c) => c.id !== id) })),
    }),
    {
      name: 'academia-custom-exercises',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
