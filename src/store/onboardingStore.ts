import { create } from "zustand";
import type { Objective, PlayerLevel, Position, TrainingFrequency } from "@/types/database";

interface OnboardingData {
  username: string;
  age: string;
  height_cm: string;
  club: string;
  training_frequency: TrainingFrequency | null;
  experience_years: string;
  position: Position | null;
  level: PlayerLevel | null;
  goals: Objective[];
}

interface OnboardingState extends OnboardingData {
  update: (patch: Partial<OnboardingData>) => void;
  toggleGoal: (goal: Objective) => void;
  reset: () => void;
}

const initial: OnboardingData = {
  username: "",
  age: "",
  height_cm: "",
  club: "",
  training_frequency: null,
  experience_years: "",
  position: null,
  level: null,
  goals: [],
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initial,
  update: (patch) => set((state) => ({ ...state, ...patch })),
  toggleGoal: (goal) =>
    set((state) => ({
      goals: state.goals.includes(goal) ? state.goals.filter((g) => g !== goal) : [...state.goals, goal],
    })),
  reset: () => set(initial),
}));
