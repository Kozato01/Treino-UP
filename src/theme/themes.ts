export type ThemeId = 'neon' | 'academia' | 'forge' | 'oceano';

export type ThemeColors = {
  green: string;
  cyan: string;
  pink: string;
  yellow: string;
  orange: string;
  red: string;
  // Surfaces (opcionais — quando ausentes, usa o padrão escuro do app)
  bg?: string;
  surface?: string;
  surface2?: string;
  bgInput?: string;
  border?: string;
  outline?: string;
  text?: string;
  textDim?: string;
  textMute?: string;
  ctaText?: string;
  ctaShadow?: string;
  heroGradient?: string;
};

export const THEMES: Record<ThemeId, ThemeColors> = {
  // Atual neon — padrão
  neon: {
    green: '#C6FF4A',
    cyan: '#4AE3FF',
    pink: '#FF4AD1',
    yellow: '#FFE44A',
    orange: '#FF8B4A',
    red: '#FF3B3B',
  },
  // Academia: vermelho intenso, dourado, laranja queimado — sensação de barra, ferro, esforço
  academia: {
    green: '#FFB627', // dourado
    cyan: '#FF6B35', // laranja queimado
    pink: '#FF3838', // vermelho academia
    yellow: '#FFD93D',
    orange: '#FF8B3D',
    red: '#E63946',
  },
  // Forge: tons quentes metálicos, vermelho-bronze e dourado, vibe ferro fundido
  forge: {
    green: '#E6A957', // bronze claro
    cyan: '#C97B4A', // cobre
    pink: '#D04848', // vermelho ferro
    yellow: '#F2C94C',
    orange: '#E68347',
    red: '#B22222',
  },
  // Oceano: azuis frios para foco
  oceano: {
    green: '#4AFFB8',
    cyan: '#4AE3FF',
    pink: '#4A8FFF',
    yellow: '#7AFFE8',
    orange: '#4ABCFF',
    red: '#FF4A8F',
  },
};

export const THEME_LABELS: Record<ThemeId, string> = {
  neon: 'Neon',
  academia: 'Academia',
  forge: 'Forge',
  oceano: 'Oceano',
};

export function applyTheme(colors: ThemeColors): void {
  const root = document.documentElement;
  root.style.setProperty('--neon-green', colors.green);
  root.style.setProperty('--neon-cyan', colors.cyan);
  root.style.setProperty('--neon-pink', colors.pink);
  root.style.setProperty('--neon-yellow', colors.yellow);
  root.style.setProperty('--neon-orange', colors.orange);
  root.style.setProperty('--neon-red', colors.red);

  // Surfaces — só sobrescreve se o tema definir; senão, remove override para voltar ao padrão.
  const surfaceKeys: [keyof ThemeColors, string][] = [
    ['bg', '--bg-base'],
    ['surface', '--bg-surface'],
    ['surface2', '--bg-surface-2'],
    ['bgInput', '--bg-input'],
    ['border', '--border'],
    ['outline', '--outline'],
    ['text', '--text'],
    ['textDim', '--text-dim'],
    ['textMute', '--text-mute'],
    ['ctaText', '--cta-text'],
    ['ctaShadow', '--cta-shadow'],
    ['heroGradient', '--hero-gradient'],
  ];
  for (const [key, cssVar] of surfaceKeys) {
    const value = colors[key];
    if (typeof value === 'string') {
      root.style.setProperty(cssVar, value);
    } else {
      root.style.removeProperty(cssVar);
    }
  }

}

function randomNeonColor(): string {
  const hue = Math.floor(Math.random() * 360);
  const sat = 85 + Math.floor(Math.random() * 15);
  const light = 60 + Math.floor(Math.random() * 10);
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

export function generateRandomTheme(): ThemeColors {
  return {
    green: randomNeonColor(),
    cyan: randomNeonColor(),
    pink: randomNeonColor(),
    yellow: randomNeonColor(),
    orange: randomNeonColor(),
    red: randomNeonColor(),
  };
}
