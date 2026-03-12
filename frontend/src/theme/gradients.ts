import { gradientTokensByMode, normalizeThemeMode, THEME_MODES } from './tokens';

export const getGradients = (mode = THEME_MODES.light) => {
  const normalizedMode = normalizeThemeMode(mode);
  return gradientTokensByMode[normalizedMode];
};
