import {
  normalizeThemeMode,
  shadowTokensByMode,
  THEME_MODES
} from './tokens';

const parseHexChannel = (value) => Number.parseInt(value, 16);

const hexToRgb = (hex) => {
  const normalized = hex.replace('#', '');

  if (normalized.length !== 6) {
    return [0, 153, 224];
  }

  return [
    parseHexChannel(normalized.slice(0, 2)),
    parseHexChannel(normalized.slice(2, 4)),
    parseHexChannel(normalized.slice(4, 6))
  ];
};

const createShadows = ({ seed, baseAlpha, stepAlpha, maxAlpha }) => {
  const color = hexToRgb(seed).join(', ');

  return Array.from({ length: 25 }, (_, index) => {
    if (index === 0) {
      return 'none';
    }

    const y = Math.round(index * 0.65 + 1);
    const blur = Math.round(index * 2.4 + 3);
    const spread = index > 6 ? -1 : 0;
    const alphaValue = Math.min(maxAlpha, baseAlpha + index * stepAlpha);

    return `0 ${y}px ${blur}px ${spread}px rgba(${color}, ${alphaValue})`;
  });
};

export const getShadows = (mode = THEME_MODES.light) => {
  const normalizedMode = normalizeThemeMode(mode);
  return createShadows(shadowTokensByMode[normalizedMode]);
};
