import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ThemeColors, ThemeId } from '../theme/themes';

export type Unit = 'kg' | 'lb';

type SettingsState = {
  name: string;
  heightCm: number | null;
  unit: Unit;
  defaultRestSeconds: number;
  theme: ThemeId | 'custom';
  customTheme: ThemeColors | null;
  dailyStepsGoal: number;
  hasSeenWelcome: boolean;
  setName: (name: string) => void;
  setHeight: (h: number | null) => void;
  setUnit: (u: Unit) => void;
  setDefaultRest: (s: number) => void;
  setTheme: (t: ThemeId) => void;
  setCustomTheme: (c: ThemeColors) => void;
  setDailyStepsGoal: (goal: number) => void;
  setHasSeenWelcome: () => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      name: '',
      heightCm: null,
      unit: 'kg',
      defaultRestSeconds: 90,
      theme: 'neon',
      customTheme: null,
      dailyStepsGoal: 10000,
      hasSeenWelcome: false,
      setName: (name) => set({ name }),
      setHeight: (heightCm) => set({ heightCm }),
      setUnit: (unit) => set({ unit }),
      setDefaultRest: (defaultRestSeconds) => set({ defaultRestSeconds }),
      setTheme: (theme) => set({ theme }),
      setCustomTheme: (customTheme) => set({ theme: 'custom', customTheme }),
      setDailyStepsGoal: (dailyStepsGoal) => set({ dailyStepsGoal }),
      setHasSeenWelcome: () => set({ hasSeenWelcome: true }),
    }),
    {
      name: 'academia-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
