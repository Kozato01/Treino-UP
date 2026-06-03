const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

export function exerciseImageUrl(path: string): string {
  return `${BASE}${path}`;
}
