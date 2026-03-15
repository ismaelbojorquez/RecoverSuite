import {
  blurTokens,
  borderTokensByMode,
  componentTokensByMode,
  fintechBlue,
  fintechDark,
  fintechSlate,
  layoutTokens,
  normalizeThemeMode,
  overlayTokensByMode,
  paletteTokensByMode,
  shadowSurfaceTokensByMode,
  stateTokensByMode,
  surfaceTokensByMode,
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
    action: modeTokens.action,
    custom: {
      securityBlue,
      securitySlate,
      fintechBlue,
      fintechDark,
      fintechSlate,
      surface: surfaceTokensByMode[normalizedMode],
      border: borderTokensByMode[normalizedMode],
      state: stateTokensByMode[normalizedMode],
      overlay: overlayTokensByMode[normalizedMode],
      shadow: shadowSurfaceTokensByMode[normalizedMode],
      blur: blurTokens,
      component: componentTokensByMode[normalizedMode]
    }
  };
};
