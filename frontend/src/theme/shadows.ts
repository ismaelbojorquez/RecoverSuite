import { normalizeThemeMode, shadowTokensByMode, THEME_MODES } from './tokens';

const parseHexChannel = (value) => Number.parseInt(value, 16);

const hexToRgb = (hex) => {
  const normalized = String(hex || '').replace('#', '');

  if (normalized.length !== 6) {
    return [11, 23, 43];
  }

  return [
    parseHexChannel(normalized.slice(0, 2)),
    parseHexChannel(normalized.slice(2, 4)),
    parseHexChannel(normalized.slice(4, 6))
  ];
};

const createShadowLevel = (
  color,
  {
    ambientAlpha,
    ambientStep,
    ambientMax,
    keyAlpha,
    keyStep,
    keyMax
  },
  index
) => {
  const ambientOpacity = Math.min(ambientMax, ambientAlpha + index * ambientStep);
  const keyOpacity = Math.min(keyMax, keyAlpha + index * keyStep);
  const ambientY = Math.max(1, Math.round(index * 0.65));
  const ambientBlur = Math.max(3, Math.round(index * 1.7 + 2));
  const keyY = Math.max(2, Math.round(index * 1.1 + 2));
  const keyBlur = Math.max(8, Math.round(index * 2.8 + 6));
  const keySpread = index > 8 ? -2 : index > 4 ? -1 : 0;

  return `0 ${ambientY}px ${ambientBlur}px 0 rgba(${color}, ${ambientOpacity}), 0 ${keyY}px ${keyBlur}px ${keySpread}px rgba(${color}, ${keyOpacity})`;
};

const createShadows = (tokens) => {
  const color = hexToRgb(tokens.seed).join(', ');

  return Array.from({ length: 25 }, (_, index) => {
    if (index === 0) {
      return 'none';
    }

    return createShadowLevel(color, tokens, index);
  });
};

export const getShadows = (mode = THEME_MODES.light) => {
  const normalizedMode = normalizeThemeMode(mode);
  return createShadows(shadowTokensByMode[normalizedMode]);
};
