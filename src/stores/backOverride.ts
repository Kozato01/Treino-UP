import { create } from 'zustand';

type BackHandler = () => boolean;

type BackOverrideState = {
  handler: BackHandler | null;
  set: (h: BackHandler | null) => void;
};

export const useBackOverride = create<BackOverrideState>((set) => ({
  handler: null,
  set: (h) => set({ handler: h }),
}));
