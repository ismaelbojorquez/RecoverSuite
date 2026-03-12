import {
  fintechDark,
  fintechBlue,
  fintechSlate,
  layoutTokens,
  normalizeThemeMode,
  paletteTokensByMode,
  THEME_MODES,
  THEME_MODE_STORAGE_KEY
} from './tokens';

export {
  layoutTokens,
  normalizeThemeMode,
  THEME_MODES,
  THEME_MODE_STORAGE_KEY
};

export const securityBlue = fintechBlue;
export const securitySlate = fintechSlate;

export const getPaletteTokens = (mode = THEME_MODES.light) => {
  const normalizedMode = normalizeThemeMode(mode);
  const modeTokens = paletteTokensByMode[normalizedMode];

  return {
    mode: normalizedMode,
    primary: modeTokens.primary,
    secondary: modeTokens.secondary,
    info: modeTokens.info,
    success: modeTokens.success,
    warning: modeTokens.warning,
    error: modeTokens.error,
    background: modeTokens.background,
    text: modeTokens.text,
    divider: modeTokens.divider,
    custom: {
      securityBlue,
      securitySlate,
      fintechBlue,
      fintechDark
    }
  };
};
