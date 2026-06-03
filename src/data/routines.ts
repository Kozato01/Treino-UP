import type { Weekday } from '../types';

export type PackageDef = {
  name: string;
  description: string;
  assignments: Partial<Record<Weekday, string>>;
};

export const PACKAGES: PackageDef[] = [
  {
    name: 'PPL Máquinas — 3x Semana',
    description: 'Push / Pull / Legs com máquinas. Ideal para iniciantes e intermediários.',
    assignments: {
      mon: 'Push — Peito, Ombros, Tríceps (Máquinas)',
      wed: 'Pull — Costas e Bíceps (Máquinas)',
      fri: 'Legs — Perna Completa (Máquinas)',
    },
  },
  {
    name: 'Full Body Iniciante — 3x Semana',
    description: 'Treino de corpo inteiro com máquinas. Perfeito para começar do zero.',
    assignments: {
      mon: 'Full Body — Iniciante com Máquinas',
      wed: 'Full Body — Iniciante com Máquinas',
      fri: 'Full Body — Iniciante com Máquinas',
    },
  },
  {
    name: 'Rotina do Usuário — 3x Semana',
    description: 'Os 3 treinos originais distribuídos na semana.',
    assignments: {
      mon: 'Treino Peito|Tríceps',
      wed: 'Treino Costas|Ombro|Bíceps',
      fri: 'Treino Perna',
    },
  },
];
