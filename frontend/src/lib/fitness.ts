export const FITNESS_OPTIONS = [
  "Weight loss",
  "Muscle gain",
  "Yoga",
  "Home workout",
  "Diet guidance",
] as const;

export type FitnessOption = (typeof FITNESS_OPTIONS)[number];
