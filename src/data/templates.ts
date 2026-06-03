type TemplateExercise = {
  exerciseId: string;
  sets: number;
  reps: number;
  restSeconds: number;
};

export type TemplateDef = {
  name: string;
  description: string;
  color: string;
  exercises: TemplateExercise[];
};

export const TEMPLATES: TemplateDef[] = [
  // === TREINOS ORIGINAIS DO USUÁRIO ===
  {
    name: 'Treino Perna',
    description: 'Treino de perna completo com aquecimento, compostos e isolados.',
    color: '#8E24AA',
    exercises: [
      { exerciseId: 'Jogging_Treadmill', sets: 1, reps: 10, restSeconds: 300 },
      { exerciseId: 'Front_Squat_Clean_Grip', sets: 4, reps: 8, restSeconds: 180 },
      { exerciseId: 'Leg_Press', sets: 3, reps: 10, restSeconds: 120 },
      { exerciseId: 'Leg_Extensions', sets: 3, reps: 12, restSeconds: 90 },
      { exerciseId: '90_90_Hamstring', sets: 3, reps: 12, restSeconds: 90 },
      { exerciseId: 'Adductor', sets: 3, reps: 15, restSeconds: 60 },
      { exerciseId: 'Thigh_Abductor', sets: 3, reps: 15, restSeconds: 60 },
      { exerciseId: 'Barbell_Seated_Calf_Raise', sets: 3, reps: 15, restSeconds: 60 },
    ],
  },
  {
    name: 'Treino Costas|Ombro|Bíceps',
    description: 'Treino completo com foco em costas, ombros e bíceps.',
    color: '#1E88E5',
    exercises: [
      { exerciseId: 'Jogging_Treadmill', sets: 1, reps: 10, restSeconds: 300 },
      { exerciseId: 'Close-Grip_Front_Lat_Pulldown', sets: 4, reps: 10, restSeconds: 120 },
      { exerciseId: 'Underhand_Cable_Pulldowns', sets: 3, reps: 10, restSeconds: 120 },
      { exerciseId: 'Alternating_Kettlebell_Row', sets: 3, reps: 10, restSeconds: 120 },
      { exerciseId: 'Alternating_Cable_Shoulder_Press', sets: 3, reps: 10, restSeconds: 120 },
      { exerciseId: 'Lateral_Raise_-_With_Bands', sets: 3, reps: 12, restSeconds: 90 },
      { exerciseId: 'Alternate_Hammer_Curl', sets: 3, reps: 12, restSeconds: 90 },
    ],
  },
  {
    name: 'Treino Peito|Tríceps',
    description: 'Treino de peito e tríceps com múltiplos ângulos.',
    color: '#E53935',
    exercises: [
      { exerciseId: 'Jogging_Treadmill', sets: 1, reps: 10, restSeconds: 300 },
      { exerciseId: 'Cable_Chest_Press', sets: 4, reps: 8, restSeconds: 150 },
      { exerciseId: 'Barbell_Bench_Press_-_Medium_Grip', sets: 3, reps: 10, restSeconds: 120 },
      { exerciseId: 'Back_Flyes_-_With_Bands', sets: 3, reps: 12, restSeconds: 90 },
      { exerciseId: 'Band_Skull_Crusher', sets: 3, reps: 12, restSeconds: 90 },
      { exerciseId: 'Triceps_Pushdown_-_Rope_Attachment', sets: 3, reps: 12, restSeconds: 90 },
    ],
  },

  // === INICIANTE COM MÁQUINAS ===
  {
    name: 'Full Body — Iniciante com Máquinas',
    description: 'Treino de corpo inteiro para iniciantes. Usa apenas máquinas. 3x por semana.',
    color: '#4CAF50',
    exercises: [
      { exerciseId: 'Jogging_Treadmill', sets: 1, reps: 10, restSeconds: 300 },
      { exerciseId: 'Leg_Press', sets: 3, reps: 12, restSeconds: 120 },
      { exerciseId: 'Leg_Extensions', sets: 3, reps: 12, restSeconds: 90 },
      { exerciseId: 'Cable_Chest_Press', sets: 3, reps: 12, restSeconds: 120 },
      { exerciseId: 'Close-Grip_Front_Lat_Pulldown', sets: 3, reps: 12, restSeconds: 120 },
      { exerciseId: 'Alternating_Cable_Shoulder_Press', sets: 3, reps: 12, restSeconds: 90 },
      { exerciseId: 'Band_Skull_Crusher', sets: 2, reps: 12, restSeconds: 60 },
    ],
  },

  // === PPL: PUSH (Peito, Ombros, Tríceps) ===
  {
    name: 'Push — Peito, Ombros, Tríceps (Máquinas)',
    description: 'Empurrar: Peito, Ombros e Tríceps. Iniciante com máquinas.',
    color: '#E53935',
    exercises: [
      { exerciseId: 'Jogging_Treadmill', sets: 1, reps: 10, restSeconds: 300 },
      { exerciseId: 'Cable_Chest_Press', sets: 4, reps: 10, restSeconds: 120 },
      { exerciseId: 'Barbell_Bench_Press_-_Medium_Grip', sets: 3, reps: 10, restSeconds: 120 },
      { exerciseId: 'Back_Flyes_-_With_Bands', sets: 3, reps: 12, restSeconds: 90 },
      { exerciseId: 'Alternating_Cable_Shoulder_Press', sets: 3, reps: 12, restSeconds: 90 },
      { exerciseId: 'Lateral_Raise_-_With_Bands', sets: 3, reps: 12, restSeconds: 60 },
      { exerciseId: 'Band_Skull_Crusher', sets: 3, reps: 12, restSeconds: 60 },
      { exerciseId: 'Triceps_Pushdown_-_Rope_Attachment', sets: 2, reps: 12, restSeconds: 60 },
    ],
  },

  // === PPL: PULL (Costas, Bíceps) ===
  {
    name: 'Pull — Costas e Bíceps (Máquinas)',
    description: 'Puxar: Costas e Bíceps. Iniciante com máquinas.',
    color: '#1E88E5',
    exercises: [
      { exerciseId: 'Jogging_Treadmill', sets: 1, reps: 10, restSeconds: 300 },
      { exerciseId: 'Close-Grip_Front_Lat_Pulldown', sets: 4, reps: 10, restSeconds: 120 },
      { exerciseId: 'Underhand_Cable_Pulldowns', sets: 3, reps: 10, restSeconds: 120 },
      { exerciseId: 'Alternating_Kettlebell_Row', sets: 3, reps: 10, restSeconds: 120 },
      { exerciseId: 'Kneeling_High_Pulley_Row', sets: 3, reps: 12, restSeconds: 90 },
      { exerciseId: 'Alternate_Hammer_Curl', sets: 3, reps: 12, restSeconds: 90 },
    ],
  },

  // === PPL: LEGS (Perna Completa) ===
  {
    name: 'Legs — Perna Completa (Máquinas)',
    description: 'Pernas: Quadríceps, Posteriores, Glúteos e Adutores/Abdutores. Iniciante com máquinas.',
    color: '#8E24AA',
    exercises: [
      { exerciseId: 'Jogging_Treadmill', sets: 1, reps: 10, restSeconds: 300 },
      { exerciseId: 'Leg_Press', sets: 4, reps: 10, restSeconds: 120 },
      { exerciseId: 'Leg_Extensions', sets: 3, reps: 12, restSeconds: 90 },
      { exerciseId: '90_90_Hamstring', sets: 3, reps: 12, restSeconds: 90 },
      { exerciseId: 'Barbell_Hip_Thrust', sets: 3, reps: 12, restSeconds: 90 },
      { exerciseId: 'Thigh_Abductor', sets: 3, reps: 15, restSeconds: 60 },
      { exerciseId: 'Adductor', sets: 3, reps: 15, restSeconds: 60 },
      { exerciseId: 'Calf_Press', sets: 3, reps: 15, restSeconds: 60 },
    ],
  },
];
