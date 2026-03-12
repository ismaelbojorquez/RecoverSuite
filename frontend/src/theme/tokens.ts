export const THEME_MODES = Object.freeze({
  light: 'light',
  dark: 'dark'
});

export const THEME_MODE_STORAGE_KEY = 'crm-theme-mode';

export const normalizeThemeMode = (mode) =>
  mode === THEME_MODES.light ? THEME_MODES.light : THEME_MODES.dark;

export const themeBehaviorTokens = Object.freeze({
  defaultMode: THEME_MODES.dark
});

export const layoutTokens = Object.freeze({
  drawerExpanded: 260,
  drawerCollapsed: 92,
  contentMaxWidth: 1380,
  container: Object.freeze({
    maxWidth: 1380,
    paddingY: Object.freeze({
      xs: 5,
      md: 7
    }),
    paddingX: Object.freeze({
      xs: 3,
      md: 5
    })
  }),
  page: Object.freeze({
    gap: 5,
    sectionGap: 4,
    sectionDenseGap: 3,
    headerGap: 3,
    headerCopyGap: 1,
    headerActionsGap: 2,
    footerMarginTop: 4
  }),
  grid: Object.freeze({
    gap: 3,
    columns: Object.freeze({
      xs: 1,
      sm: 2,
      lg: 3
    })
  })
});

export const spacingTokens = Object.freeze({
  unit: 4,
  scale: Object.freeze({
    0: 0,
    0.5: 0.5,
    1: 1,
    1.5: 1.5,
    2: 2,
    2.5: 2.5,
    3: 3,
    4: 4,
    5: 5,
    6: 6
  }),
  cardPadding: 3,
  pageGap: layoutTokens.page.gap,
  sectionGap: layoutTokens.page.sectionGap,
  sectionDenseGap: layoutTokens.page.sectionDenseGap,
  containerPaddingY: layoutTokens.container.paddingY,
  containerPaddingX: layoutTokens.container.paddingX
});

export const radiusTokens = Object.freeze({
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  round: 999
});

export const shapeTokens = Object.freeze({
  baseRadius: radiusTokens.md,
  cardRadius: radiusTokens.lg,
  inputRadius: radiusTokens.sm
});

export const motionTokens = Object.freeze({
  microDurationMs: 150,
  standardDurationMs: 200,
  entranceDurationMs: 300,
  microEasing: 'ease-out',
  standardEasing: 'ease-out',
  micro: '150ms ease-out',
  standard: '200ms ease-out'
});

export const fintechBlue = Object.freeze({
  50: '#eef2ff',
  100: '#e0e7ff',
  200: '#c7d2fe',
  300: '#a5b4fc',
  400: '#818cf8',
  500: '#6366f1',
  600: '#4f46e5',
  700: '#4338ca',
  800: '#3730a3',
  900: '#312e81',
  950: '#1e1b4b'
});

export const fintechSlate = Object.freeze({
  50: '#f8fafc',
  100: '#f1f5f9',
  200: '#e2e8f0',
  300: '#cbd5e1',
  400: '#94a3b8',
  500: '#64748b',
  600: '#475569',
  700: '#334155',
  800: '#1e293b',
  900: '#0f172a',
  950: '#020617'
});

export const fintechDark = Object.freeze({
  50: '#f8fafc',
  100: '#e2e8f0',
  200: '#cbd5e1',
  300: '#94a3b8',
  400: '#64748b',
  500: '#334155',
  600: '#1e293b',
  700: '#111827',
  800: '#0f172a',
  900: '#0b1120',
  950: '#070b14'
});

export const securityBlue = fintechBlue;
export const securitySlate = fintechSlate;

export const semanticScales = Object.freeze({
  success: Object.freeze({
    100: '#dcfce7',
    400: '#4ade80',
    600: '#16a34a',
    700: '#15803d'
  }),
  warning: Object.freeze({
    100: '#fef3c7',
    400: '#fbbf24',
    600: '#d97706',
    900: '#78350f'
  }),
  error: Object.freeze({
    100: '#fee2e2',
    400: '#f87171',
    600: '#dc2626',
    900: '#7f1d1d'
  })
});

export const colorTokens = Object.freeze({
  brand: Object.freeze({
    fintechBlue,
    fintechSlate,
    fintechDark
  }),
  semantic: semanticScales
});

export const paletteTokensByMode = Object.freeze({
  light: Object.freeze({
    primary: Object.freeze({
      main: fintechBlue[500],
      light: fintechBlue[400],
      dark: fintechBlue[600],
      contrastText: '#ffffff'
    }),
    secondary: Object.freeze({
      main: fintechSlate[700],
      light: fintechSlate[500],
      dark: fintechSlate[800],
      contrastText: '#ffffff'
    }),
    info: Object.freeze({
      main: fintechBlue[500],
      contrastText: '#ffffff'
    }),
    success: Object.freeze({
      main: semanticScales.success[600],
      contrastText: '#ffffff'
    }),
    warning: Object.freeze({
      main: semanticScales.warning[600],
      contrastText: semanticScales.warning[900]
    }),
    error: Object.freeze({
      main: semanticScales.error[600],
      contrastText: '#ffffff'
    }),
    background: Object.freeze({
      default: '#f8fafc',
      paper: '#ffffff'
    }),
    text: Object.freeze({
      primary: '#0f172a',
      secondary: '#475569'
    }),
    divider: 'rgba(15, 23, 42, 0.12)'
  }),
  dark: Object.freeze({
    primary: Object.freeze({
      main: '#6366f1',
      light: '#818cf8',
      dark: '#4f46e5',
      contrastText: '#eef2ff'
    }),
    secondary: Object.freeze({
      main: '#243349',
      light: '#32435f',
      dark: '#1a263d',
      contrastText: '#e6edf7'
    }),
    info: Object.freeze({
      main: '#6366f1',
      contrastText: '#eef2ff'
    }),
    success: Object.freeze({
      main: '#16a34a',
      contrastText: '#eef2ff'
    }),
    warning: Object.freeze({
      main: '#d97706',
      contrastText: '#eef2ff'
    }),
    error: Object.freeze({
      main: '#dc2626',
      contrastText: '#eef2ff'
    }),
    background: Object.freeze({
      default: '#111827',
      paper: '#182235'
    }),
    text: Object.freeze({
      primary: '#e6edf7',
      secondary: '#a6b4ca'
    }),
    divider: 'rgba(226, 232, 240, 0.14)'
  })
});

export const typographyTokens = Object.freeze({
  fontFamily:
    "'Plus Jakarta Sans', 'Inter', 'SF Pro Text', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', sans-serif",
  h1: Object.freeze({
    fontWeight: 700,
    fontSize: '2.65rem',
    lineHeight: 1.08,
    letterSpacing: '-0.035em'
  }),
  h2: Object.freeze({
    fontWeight: 680,
    fontSize: '2.15rem',
    lineHeight: 1.12,
    letterSpacing: '-0.028em'
  }),
  h3: Object.freeze({
    fontWeight: 650,
    fontSize: '1.75rem',
    lineHeight: 1.2,
    letterSpacing: '-0.02em'
  }),
  h4: Object.freeze({
    fontWeight: 620,
    fontSize: '1.45rem',
    lineHeight: 1.26,
    letterSpacing: '-0.012em'
  }),
  h5: Object.freeze({
    fontWeight: 610,
    fontSize: '1.2rem',
    lineHeight: 1.32,
    letterSpacing: '-0.008em'
  }),
  h6: Object.freeze({
    fontWeight: 600,
    fontSize: '1.03rem',
    lineHeight: 1.38,
    letterSpacing: '-0.004em'
  }),
  subtitle1: Object.freeze({
    fontWeight: 560,
    fontSize: '1rem',
    lineHeight: 1.58,
    letterSpacing: '0.002em'
  }),
  subtitle2: Object.freeze({
    fontWeight: 550,
    fontSize: '0.9rem',
    lineHeight: 1.52,
    letterSpacing: '0.004em'
  }),
  body1: Object.freeze({
    fontWeight: 400,
    fontSize: '1rem',
    lineHeight: 1.72,
    letterSpacing: '0.003em'
  }),
  body2: Object.freeze({
    fontWeight: 400,
    fontSize: '0.9375rem',
    lineHeight: 1.64,
    letterSpacing: '0.004em'
  }),
  caption: Object.freeze({
    fontWeight: 500,
    fontSize: '0.8125rem',
    lineHeight: 1.45,
    letterSpacing: '0.014em'
  }),
  overline: Object.freeze({
    fontWeight: 600,
    letterSpacing: '0.08em'
  }),
  button: Object.freeze({
    textTransform: 'none',
    fontWeight: 600,
    letterSpacing: '0.006em'
  })
});

export const typographyRoleTokens = Object.freeze({
  page: Object.freeze({
    title: Object.freeze({
      fontWeight: 650,
      fontSize: '2.35rem',
      lineHeight: 1.08,
      letterSpacing: '-0.034em'
    }),
    subtitle: Object.freeze({
      fontWeight: 500,
      fontSize: '1rem',
      lineHeight: 1.72,
      letterSpacing: '0.003em'
    })
  }),
  section: Object.freeze({
    title: Object.freeze({
      fontWeight: 620,
      fontSize: '1.12rem',
      lineHeight: 1.44,
      letterSpacing: '-0.005em'
    }),
    subtitle: Object.freeze({
      fontWeight: 500,
      fontSize: '0.875rem',
      lineHeight: 1.62,
      letterSpacing: '0.003em'
    })
  }),
  label: Object.freeze({
    default: Object.freeze({
      fontWeight: 600,
      fontSize: '0.73rem',
      lineHeight: 1.5,
      letterSpacing: '0.07em',
      textTransform: 'uppercase'
    }),
    subdued: Object.freeze({
      fontWeight: 520,
      fontSize: '0.75rem',
      lineHeight: 1.5,
      letterSpacing: '0.04em'
    })
  }),
  metric: Object.freeze({
    value: Object.freeze({
      fontWeight: 620,
      fontSize: '2.2rem',
      lineHeight: 1.04,
      letterSpacing: '-0.03em',
      fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
      fontVariantNumeric: 'tabular-nums lining-nums'
    }),
    delta: Object.freeze({
      fontWeight: 650,
      fontSize: '0.76rem',
      lineHeight: 1.5,
      letterSpacing: '0.03em',
      fontVariantNumeric: 'tabular-nums'
    }),
    label: Object.freeze({
      fontWeight: 600,
      fontSize: '0.73rem',
      lineHeight: 1.5,
      letterSpacing: '0.09em',
      textTransform: 'uppercase'
    })
  })
});

export const elevationTokensByMode = Object.freeze({
  light: Object.freeze({
    seed: '#0f172a',
    baseAlpha: 0.02,
    stepAlpha: 0.003,
    maxAlpha: 0.14
  }),
  dark: Object.freeze({
    seed: '#1b2435',
    baseAlpha: 0.16,
    stepAlpha: 0.0032,
    maxAlpha: 0.3
  })
});

export const shadowTokensByMode = elevationTokensByMode;

export const elevationTokens = Object.freeze({
  byMode: elevationTokensByMode,
  levels: Object.freeze({
    flat: 0,
    raised: 6,
    overlay: 12,
    floating: 18
  })
});

export const gradientTokensByMode = Object.freeze({
  light: Object.freeze({
    appBackground:
      'radial-gradient(circle at 10% 0%, rgba(99, 102, 241, 0.14) 0%, rgba(99, 102, 241, 0) 38%), linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
    appLoader:
      'radial-gradient(circle at 18% 8%, rgba(99, 102, 241, 0.18) 0%, transparent 40%), linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
    authScreen:
      'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.16) 0%, rgba(99, 102, 241, 0) 52%), linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
    brandMark: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
    cardSurface:
      'linear-gradient(160deg, rgba(255, 255, 255, 0.88) 0%, rgba(248, 250, 252, 0.78) 100%)',
    cardSurfaceSoft:
      'linear-gradient(160deg, rgba(255, 255, 255, 0.92) 0%, rgba(248, 250, 252, 0.82) 56%, rgba(241, 245, 249, 0.72) 100%)',
    sidebarBackground:
      'linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(248, 250, 252, 0.82) 52%, rgba(241, 245, 249, 0.74) 100%)',
    sidebarActiveGlow:
      'linear-gradient(90deg, rgba(99, 102, 241, 0.3) 0%, rgba(99, 102, 241, 0) 100%)',
    dashboardHero:
      'radial-gradient(circle at 12% 18%, rgba(99, 102, 241, 0.22) 0%, transparent 44%), linear-gradient(156deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.76) 58%, rgba(241, 245, 249, 0.66) 100%)',
    dashboardGlass:
      'linear-gradient(155deg, rgba(255, 255, 255, 0.86) 0%, rgba(248, 250, 252, 0.74) 54%, rgba(241, 245, 249, 0.64) 100%)',
    buttonPrimary:
      'linear-gradient(135deg, #6366f1 0%, #818cf8 54%, #a5b4fc 100%)',
    buttonSubtle:
      'linear-gradient(135deg, rgba(99, 102, 241, 0.16) 0%, rgba(129, 140, 248, 0.1) 54%, rgba(165, 180, 252, 0.08) 100%)'
  }),
  dark: Object.freeze({
    appBackground:
      'radial-gradient(circle at 12% 0%, rgba(99, 102, 241, 0.16) 0%, rgba(99, 102, 241, 0) 44%), linear-gradient(180deg, #111827 0%, #172238 100%)',
    appLoader:
      'radial-gradient(circle at 18% 8%, rgba(99, 102, 241, 0.24) 0%, transparent 42%), linear-gradient(180deg, #111827 0%, #172238 100%)',
    authScreen:
      'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.2) 0%, rgba(99, 102, 241, 0) 58%), linear-gradient(180deg, #111827 0%, #172238 100%)',
    brandMark: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
    cardSurface:
      'linear-gradient(160deg, rgba(24, 34, 53, 0.84) 0%, rgba(17, 24, 39, 0.72) 100%)',
    cardSurfaceSoft:
      'linear-gradient(160deg, rgba(34, 49, 74, 0.84) 0%, rgba(24, 34, 53, 0.76) 58%, rgba(17, 24, 39, 0.68) 100%)',
    sidebarBackground:
      'linear-gradient(180deg, rgba(24, 34, 53, 0.88) 0%, rgba(20, 31, 48, 0.82) 52%, rgba(17, 24, 39, 0.76) 100%)',
    sidebarActiveGlow:
      'linear-gradient(90deg, rgba(99, 102, 241, 0.32) 0%, rgba(99, 102, 241, 0) 100%)',
    dashboardHero:
      'radial-gradient(circle at 12% 18%, rgba(99, 102, 241, 0.22) 0%, transparent 44%), linear-gradient(156deg, rgba(34, 49, 74, 0.84) 0%, rgba(24, 34, 53, 0.74) 58%, rgba(17, 24, 39, 0.66) 100%)',
    dashboardGlass:
      'linear-gradient(155deg, rgba(34, 49, 74, 0.8) 0%, rgba(24, 34, 53, 0.72) 52%, rgba(17, 24, 39, 0.66) 100%)',
    buttonPrimary:
      'linear-gradient(135deg, #6366f1 0%, #4f46e5 54%, #4338ca 100%)',
    buttonSubtle:
      'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(79, 70, 229, 0.14) 54%, rgba(67, 56, 202, 0.1) 100%)'
  })
});
