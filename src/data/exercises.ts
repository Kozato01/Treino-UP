import type { Exercise } from '../types';
import exercisesJson from './exercises_pt.json';
import { SEARCH_SYNONYMS } from './exerciseLabels';

type RawExercise = {
  id: string;
  name: string;
  name_en?: string;
  force: string | null;
  level: string;
  mechanic: string | null;
  equipment: string | null;
  category: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  instructions?: string[];
  images?: string[];
};

export const EXERCISES: Exercise[] = (exercisesJson as RawExercise[]).map((e) => ({
  id: e.id,
  name: e.name,
  namePt: e.name,
  force: e.force ?? null,
  level: e.level,
  mechanic: e.mechanic ?? null,
  equipment: e.equipment ?? null,
  category: e.category,
  primaryMuscles: e.primaryMuscles ?? [],
  secondaryMuscles: e.secondaryMuscles ?? [],
  instructions: e.instructions ?? [],
  images: e.images ?? [],
}));

const EXERCISE_MAP = new Map(EXERCISES.map((e) => [e.id, e]));

// === Custom exercises registry ===
// Populado em runtime via registerCustomExercises (chamado pelo App.tsx)
const CUSTOM_MAP = new Map<string, Exercise>();

export function registerCustomExercises(list: Exercise[]): void {
  CUSTOM_MAP.clear();
  for (const e of list) CUSTOM_MAP.set(e.id, e);
}

export function getCustomExercises(): Exercise[] {
  return Array.from(CUSTOM_MAP.values());
}

export function getExerciseById(id: string): Exercise | undefined {
  return EXERCISE_MAP.get(id) ?? CUSTOM_MAP.get(id);
}

// === Normalização ===

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(s: string): string[] {
  return normalize(s).split(' ').filter(Boolean);
}

// === Índices pré-computados ===

// WORD_INDEX: para cada exercício, conjunto de palavras individuais que aparecem
// no nome, músculos, equipamento, OU em sinônimos de cada termo. Usado para match
// de palavra exata (evita "leg" casar com "single leg").
const WORD_INDEX: Map<string, Set<string>> = new Map();

// PHRASE_BLOB: blob de texto com sinônimos multi-palavra preservados (mantém o
// espaço interno). Usado para match de frases (bigramas/queries inteiras).
const PHRASE_BLOB: Map<string, string> = new Map();

// PRIMARY_MUSCLE_WORDS: palavras dos músculos primários + seus sinônimos.
// Usado pelo ranking para priorizar resultados onde o termo casa o músculo principal.
const PRIMARY_MUSCLE_WORDS: Map<string, Set<string>> = new Map();

const NAME_INDEX: Map<string, string> = new Map();

function addTermToSets(term: string, words: Set<string>, phrases: Set<string>) {
  const n = normalize(term);
  if (!n) return;
  phrases.add(n);
  // Quebra em palavras individuais e adiciona ao word set.
  for (const w of n.split(' ')) words.add(w);
  // Expande sinônimos: cada sinônimo entra como frase (preserva espaço) E palavra a palavra.
  const phraseSyns = SEARCH_SYNONYMS[n];
  if (phraseSyns) {
    for (const s of phraseSyns) {
      const ns = normalize(s);
      if (!ns) continue;
      phrases.add(ns);
      for (const w of ns.split(' ')) words.add(w);
    }
  }
  // Para cada palavra individual do termo, expande sinônimos dela também.
  for (const w of n.split(' ')) {
    const wordSyns = SEARCH_SYNONYMS[w];
    if (wordSyns) {
      for (const s of wordSyns) {
        const ns = normalize(s);
        if (!ns) continue;
        phrases.add(ns);
        for (const ww of ns.split(' ')) words.add(ww);
      }
    }
  }
}

for (const e of EXERCISES) {
  const words = new Set<string>();
  const phrases = new Set<string>();
  const primaryWords = new Set<string>();

  addTermToSets(e.name, words, phrases);
  for (const m of e.primaryMuscles) {
    addTermToSets(m, words, phrases);
    // Também enriquece o set específico de músculo primário.
    addTermToSets(m, primaryWords, new Set<string>());
  }
  for (const m of e.secondaryMuscles) addTermToSets(m, words, phrases);
  if (e.equipment) addTermToSets(e.equipment, words, phrases);

  WORD_INDEX.set(e.id, words);
  PHRASE_BLOB.set(e.id, [...phrases].join(' '));
  PRIMARY_MUSCLE_WORDS.set(e.id, primaryWords);
  NAME_INDEX.set(e.id, normalize(e.name));
}

// === Expansão de tokens (sinônimos) ===

function expandToken(t: string): string[] {
  const syns = SEARCH_SYNONYMS[t];
  if (!syns) return [t];
  const out = [t];
  for (const s of syns) {
    const ns = normalize(s);
    if (ns) out.push(ns);
  }
  return out;
}

// === Busca pública ===

export function searchExercises(query: string, muscles?: string[]): Exercise[] {
  let list = EXERCISES;

  if (muscles && muscles.length) {
    const set = new Set(muscles);
    list = list.filter((e) => e.primaryMuscles.some((m) => set.has(m)));
  }

  const normQuery = normalize(query);
  if (!normQuery) return list;

  const tokens = tokenize(query);

  // Caso especial: query inteira é uma frase conhecida (ex: "hip thrust").
  // Nesse caso, basta uma variante da frase aparecer no blob.
  const queryIsKnownPhrase = !!SEARCH_SYNONYMS[normQuery];
  const fullPhraseVariants: string[] = [];
  if (queryIsKnownPhrase) {
    fullPhraseVariants.push(normQuery);
    for (const s of SEARCH_SYNONYMS[normQuery]) fullPhraseVariants.push(normalize(s));
  }

  // Construção de "match groups": cada grupo é uma unidade que precisa casar.
  // - Bigramas conhecidos (ex: "single arm") consomem 2 tokens e viram um grupo de frase.
  // - Tokens não consumidos viram grupos de token único.
  type MatchGroup = { variants: string[]; isPhrase: boolean };
  const groups: MatchGroup[] = [];
  const consumed = new Set<number>();
  for (let i = 0; i < tokens.length - 1; i++) {
    if (consumed.has(i)) continue;
    const bigram = `${tokens[i]} ${tokens[i + 1]}`;
    const bigramSyns = SEARCH_SYNONYMS[bigram];
    if (bigramSyns) {
      const variants = [bigram];
      for (const s of bigramSyns) variants.push(normalize(s));
      groups.push({ variants, isPhrase: true });
      consumed.add(i);
      consumed.add(i + 1);
    }
  }
  for (let i = 0; i < tokens.length; i++) {
    if (consumed.has(i)) continue;
    groups.push({ variants: expandToken(tokens[i]), isPhrase: false });
  }

  const firstVariants = expandToken(tokens[0]);
  const scored: { ex: Exercise; score: number }[] = [];

  for (const ex of list) {
    const words = WORD_INDEX.get(ex.id);
    const blob = PHRASE_BLOB.get(ex.id) ?? '';
    if (!words) continue;

    // Critério principal: query é frase inteira conhecida OR todos os grupos casam.
    if (queryIsKnownPhrase) {
      if (!fullPhraseVariants.some((v) => blob.includes(v))) continue;
    } else {
      let allMatch = true;
      for (const g of groups) {
        let hit = false;
        for (const v of g.variants) {
          // Frases (com espaço) sempre via substring no blob.
          // Tokens únicos via word-set (evita falsos positivos de substring).
          if (v.includes(' ')) {
            if (blob.includes(v)) { hit = true; break; }
          } else {
            if (words.has(v)) { hit = true; break; }
          }
        }
        if (!hit) { allMatch = false; break; }
      }
      if (!allMatch) continue;
    }

    // === Ranking ===
    const name = NAME_INDEX.get(ex.id) ?? '';
    const primaryWords = PRIMARY_MUSCLE_WORDS.get(ex.id);

    let score = 0;
    // Boost forte: nome começa com o primeiro token (ou sinônimo).
    if (firstVariants.some((v) => name.startsWith(v))) score += 100;
    else if (firstVariants.some((v) => name.includes(v))) score += 50;
    // Boost adicional: nome contém uma variante de frase do match.
    for (const g of groups) {
      if (g.isPhrase && g.variants.some((v) => name.includes(v))) {
        score += 30;
        break;
      }
    }
    if (queryIsKnownPhrase && fullPhraseVariants.some((v) => name.includes(v))) score += 30;
    // Boost por músculo primário: token único casa com músculo principal.
    if (primaryWords) {
      for (const g of groups) {
        if (!g.isPhrase && g.variants.some((v) => !v.includes(' ') && primaryWords.has(v))) {
          score += 25;
          break;
        }
      }
    }
    // Desempate: nome curto vence nome longo.
    score -= name.length * 0.01;

    scored.push({ ex, score });
  }

  scored.sort((a, b) => b.score - a.score);

  // Custom exercises: match simples por substring no nome ou músculo primário.
  // Sempre aparecem no TOPO quando matcham (precedência para o que o usuário criou).
  const customMatches: Exercise[] = [];
  for (const ex of CUSTOM_MAP.values()) {
    if (muscles && muscles.length) {
      const set = new Set(muscles);
      if (!ex.primaryMuscles.some((m) => set.has(m))) continue;
    }
    if (!normQuery) {
      customMatches.push(ex);
      continue;
    }
    const exBlob = normalize(`${ex.name} ${ex.primaryMuscles.join(' ')} ${ex.equipment ?? ''}`);
    if (tokens.every((t) => exBlob.includes(t))) customMatches.push(ex);
  }

  return [...customMatches, ...scored.map((s) => s.ex)];
}
