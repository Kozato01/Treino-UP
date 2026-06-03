// Cardápio personalizado — Willams Diogo (26 anos).
// Dados estáticos do plano alimentar exibido na aba "Alimentação" do Perfil.
// Os horários (`time`) também alimentam os lembretes (notificações locais).

export interface MealItem {
  group: string; // Grupo alimentar
  food: string; // Alimento
  portions?: string; // Nº de porções
  measure: string; // Medida caseira
  grams?: string; // Quantidade aproximada
  subs?: string; // Lista de substitutos (referência)
}

export interface MealOption {
  label: string; // Ex.: "OPÇÃO 1"
  items: MealItem[];
  note?: string;
}

export interface Meal {
  id: string;
  icon: string; // emoji
  title: string;
  time: string; // "HH:MM" — usado pelos lembretes
  note?: string;
  items?: MealItem[]; // refeição com tabela única
  options?: MealOption[]; // refeição com opções (ex.: lanche)
}

export const MEAL_PLAN: Meal[] = [
  {
    id: 'cafe',
    icon: '☕',
    title: 'Café da Manhã',
    time: '08:00',
    note: 'Café coado adoçado com Stevia.',
    items: [
      { group: 'Queijos e ovos', food: 'Ovos mexidos ou cozidos', portions: '2', measure: '2 unidades', grams: '100g', subs: '2' },
      { group: 'Pães, Cereais', food: 'Cuscuz c/ aveia', portions: '2', measure: '2 fatias finas', grams: '90g', subs: '11' },
      { group: 'Fibras', food: 'Farinha de aveia', portions: '1', measure: '1 colher de sopa', grams: '10g', subs: '5' },
      { group: 'Frutas', food: 'Mamão', portions: '1', measure: '1 fatia', grams: '135g', subs: '1' },
    ],
  },
  {
    id: 'almoco',
    icon: '🍽️',
    title: 'Almoço',
    time: '12:00',
    note: 'Carnes sempre assadas sem óleo, grelhadas ou cozidas.',
    items: [
      { group: 'Vegetais A', food: 'Alface americana', portions: '1', measure: '1 pires de sobremesa', grams: '38g', subs: '3' },
      { group: 'Vegetais A', food: 'Pepino cru', portions: '1', measure: '3 colheres de sopa', grams: '54g', subs: '3' },
      { group: 'Vegetais B', food: 'Tomate cru', portions: '1', measure: '5 rodelas', grams: '80g', subs: '4' },
      { group: 'Vegetais B', food: 'Cenoura cozida', portions: '2', measure: '6 colheres de sopa', grams: '120g', subs: '4' },
      { group: 'Leguminosas', food: 'Feijão preto', portions: '1', measure: '1 concha pequena', grams: '80g', subs: '8' },
      { group: 'Fibras', food: 'Farelo de aveia', portions: '1', measure: '1 colher de sopa', grams: '10g', subs: '5' },
      { group: 'Cereais', food: 'Arroz branco cozido', portions: '½', measure: '3 colheres de sopa', grams: '50g', subs: '11' },
      { group: 'Carnes', food: 'Peixe corvina', portions: '2', measure: '2 postas pequenas', grams: '100g', subs: '6' },
      { group: 'Frutas', food: 'Melancia', portions: '1', measure: '1 fatia média', grams: '150g', subs: '1' },
    ],
  },
  {
    id: 'lanche',
    icon: '🥪',
    title: 'Lanche da Tarde',
    time: '15:00',
    options: [
      {
        label: 'OPÇÃO 1',
        note: 'Acrescentar saladas.',
        items: [
          { group: 'Carnes', food: 'Peito de frango desfiado', portions: '1', measure: '1 fatia pequena', grams: '70g', subs: '6' },
          { group: 'Pães e Biscoito', food: 'Pão integral', portions: '2', measure: '2 fatias', grams: '50g', subs: '9' },
        ],
      },
      {
        label: 'OPÇÃO 2',
        items: [
          { group: 'Leite/Iogurtes', food: 'Iogurte desnatado natural', portions: '1', measure: '1 unidade', grams: '185g', subs: '10' },
          { group: 'Fibras', food: 'Chia', portions: '1', measure: '1 colher de sopa', grams: '-', subs: '-' },
          { group: 'Frutas', food: 'Maçã', portions: '1', measure: '1 unidade', grams: '100g', subs: '1' },
        ],
      },
    ],
  },
  {
    id: 'jantar',
    icon: '🍲',
    title: 'Jantar',
    time: '19:00',
    note: 'Acrescentar saladas no jantar.',
    items: [
      { group: 'Tubérculos', food: 'Macaxeira', portions: '2', measure: '2 raízes médias', grams: '200g', subs: '11' },
      { group: 'Carnes', food: 'Frango assado', portions: '2', measure: '2 coxas', grams: '100g', subs: '6' },
    ],
  },
];
