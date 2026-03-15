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
  drawerExpanded: 256,
  drawerCollapsed: 88,
  contentMaxWidth: 1560,
  headerHeight: Object.freeze({
    xs: 58,
    md: 62
  }),
  container: Object.freeze({
    maxWidth: 1560,
    paddingY: Object.freeze({
      xs: 2.75,
      md: 3.5
    }),
    paddingX: Object.freeze({
      xs: 1.5,
      sm: 2,
      md: 2.75
    })
  }),
  page: Object.freeze({
    gap: 2.8,
    sectionGap: 2.15,
    sectionDenseGap: 1.35,
    headerGap: 1.1,
    headerCopyGap: 0.45,
    headerActionsGap: 0.8,
    footerMarginTop: 2.25
  }),
  grid: Object.freeze({
    gap: 1.9,
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
    3.5: 3.5,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8
  }),
  cardPadding: 2.5,
  cardPaddingCompact: 1.75,
  pageGap: layoutTokens.page.gap,
  sectionGap: layoutTokens.page.sectionGap,
  sectionDenseGap: layoutTokens.page.sectionDenseGap,
  containerPaddingY: layoutTokens.container.paddingY,
  containerPaddingX: layoutTokens.container.paddingX
});

export const radiusTokens = Object.freeze({
  xs: 8,
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999
});

export const shapeTokens = Object.freeze({
  baseRadius: radiusTokens.md,
  cardRadius: radiusTokens.lg,
  inputRadius: radiusTokens.sm,
  floatingRadius: radiusTokens.xl
});

export const blurTokens = Object.freeze({
  none: 0,
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18
});

export const motionTokens = Object.freeze({
  microDurationMs: 140,
  standardDurationMs: 220,
  entranceDurationMs: 320,
  microEasing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  standardEasing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  micro: '140ms cubic-bezier(0.22, 1, 0.36, 1)',
  standard: '220ms cubic-bezier(0.22, 1, 0.36, 1)'
});

export const fintechBlue = Object.freeze({
  50: '#edf4ff',
  100: '#d8e8ff',
  200: '#b6d2ff',
  300: '#8ab3ff',
  400: '#5f92ff',
  500: '#3a74f5',
  600: '#255dd7',
  700: '#1c49ac',
  800: '#16367d',
  900: '#102656',
  950: '#09152d'
});

export const fintechSlate = Object.freeze({
  50: '#f6f9fc',
  100: '#eef3f8',
  200: '#dde6f0',
  300: '#c4d1df',
  400: '#97a7bc',
  500: '#6f8097',
  600: '#526277',
  700: '#3b495e',
  800: '#263246',
  900: '#162133',
  950: '#0b1220'
});

export const fintechDark = Object.freeze({
  50: '#f3f7fd',
  100: '#dce5f2',
  200: '#bdcade',
  300: '#97a9c1',
  400: '#7589a3',
  500: '#566a85',
  600: '#3d4f69',
  700: '#2a3951',
  800: '#1a283d',
  900: '#0f192b',
  950: '#08111e'
});

export const semanticScales = Object.freeze({
  success: Object.freeze({
    50: '#eefbf4',
    100: '#d7f5e3',
    400: '#35b26f',
    500: '#238e59',
    600: '#1a7449',
    700: '#13583a'
  }),
  warning: Object.freeze({
    50: '#fff9ef',
    100: '#fdeccd',
    400: '#e7a646',
    500: '#c98525',
    600: '#9e6714',
    700: '#7a500d'
  }),
  error: Object.freeze({
    50: '#fff2f1',
    100: '#ffdedd',
    400: '#e46c63',
    500: '#c64f47',
    600: '#a33e37',
    700: '#7f2e29'
  }),
  info: Object.freeze({
    50: '#eef6ff',
    100: '#d9e9ff',
    400: '#5f92ff',
    500: '#3a74f5',
    600: '#255dd7',
    700: '#1c49ac'
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

export const surfaceTokensByMode = Object.freeze({
  light: Object.freeze({
    appCanvas: '#f5f8fc',
    appCanvasRaised: '#eef4f9',
    header: 'rgba(248, 251, 255, 0.86)',
    sidebar: 'rgba(251, 253, 255, 0.9)',
    shell: 'rgba(255, 255, 255, 0.84)',
    card: 'rgba(255, 255, 255, 0.9)',
    cardSoft: 'rgba(249, 252, 255, 0.86)',
    cardMuted: 'rgba(244, 248, 252, 0.92)',
    floating: 'rgba(255, 255, 255, 0.94)',
    input: 'rgba(255, 255, 255, 0.92)',
    inputRaised: 'rgba(255, 255, 255, 0.98)',
    table: 'rgba(255, 255, 255, 0.93)',
    tableHead: 'rgba(248, 251, 255, 0.92)',
    dialog: 'rgba(255, 255, 255, 0.95)',
    badge: 'rgba(246, 250, 255, 0.96)',
    accent: 'rgba(58, 116, 245, 0.1)',
    shine: 'rgba(255, 255, 255, 0.62)',
    shadowTint: 'rgba(11, 23, 43, 0.12)',
    saturate: 136
  }),
  dark: Object.freeze({
    appCanvas: '#07101c',
    appCanvasRaised: '#0b1726',
    header: 'rgba(9, 18, 31, 0.82)',
    sidebar: 'rgba(10, 20, 34, 0.88)',
    shell: 'rgba(12, 22, 38, 0.82)',
    card: 'rgba(15, 27, 45, 0.88)',
    cardSoft: 'rgba(18, 31, 50, 0.84)',
    cardMuted: 'rgba(12, 22, 38, 0.94)',
    floating: 'rgba(18, 30, 48, 0.94)',
    input: 'rgba(12, 23, 39, 0.88)',
    inputRaised: 'rgba(17, 30, 49, 0.96)',
    table: 'rgba(14, 25, 43, 0.92)',
    tableHead: 'rgba(16, 28, 47, 0.94)',
    dialog: 'rgba(14, 24, 41, 0.95)',
    badge: 'rgba(17, 29, 47, 0.96)',
    accent: 'rgba(95, 146, 255, 0.14)',
    shine: 'rgba(255, 255, 255, 0.08)',
    shadowTint: 'rgba(2, 7, 16, 0.44)',
    saturate: 140
  })
});

export const borderTokensByMode = Object.freeze({
  light: Object.freeze({
    subtle: 'rgba(15, 36, 61, 0.06)',
    soft: 'rgba(15, 36, 61, 0.09)',
    standard: 'rgba(15, 36, 61, 0.12)',
    strong: 'rgba(15, 36, 61, 0.18)',
    accent: 'rgba(58, 116, 245, 0.22)',
    focus: 'rgba(58, 116, 245, 0.2)',
    inverse: 'rgba(255, 255, 255, 0.2)'
  }),
  dark: Object.freeze({
    subtle: 'rgba(195, 214, 241, 0.07)',
    soft: 'rgba(195, 214, 241, 0.12)',
    standard: 'rgba(195, 214, 241, 0.16)',
    strong: 'rgba(195, 214, 241, 0.24)',
    accent: 'rgba(95, 146, 255, 0.3)',
    focus: 'rgba(95, 146, 255, 0.28)',
    inverse: 'rgba(255, 255, 255, 0.22)'
  })
});

export const stateTokensByMode = Object.freeze({
  light: Object.freeze({
    hover: 'rgba(58, 116, 245, 0.06)',
    hoverStrong: 'rgba(58, 116, 245, 0.1)',
    active: 'rgba(58, 116, 245, 0.12)',
    selected: 'rgba(58, 116, 245, 0.14)',
    muted: 'rgba(15, 36, 61, 0.04)',
    disabledBg: 'rgba(15, 36, 61, 0.05)',
    disabledText: 'rgba(66, 84, 102, 0.48)',
    emphasis: 'rgba(255, 255, 255, 0.66)'
  }),
  dark: Object.freeze({
    hover: 'rgba(95, 146, 255, 0.12)',
    hoverStrong: 'rgba(95, 146, 255, 0.18)',
    active: 'rgba(95, 146, 255, 0.22)',
    selected: 'rgba(95, 146, 255, 0.2)',
    muted: 'rgba(195, 214, 241, 0.06)',
    disabledBg: 'rgba(195, 214, 241, 0.08)',
    disabledText: 'rgba(147, 165, 188, 0.48)',
    emphasis: 'rgba(255, 255, 255, 0.08)'
  })
});

export const overlayTokensByMode = Object.freeze({
  light: Object.freeze({
    soft: 'rgba(15, 36, 61, 0.08)',
    scrim: 'rgba(8, 20, 38, 0.18)',
    modal: 'rgba(8, 20, 38, 0.26)',
    drawer: 'rgba(8, 20, 38, 0.22)'
  }),
  dark: Object.freeze({
    soft: 'rgba(5, 9, 18, 0.18)',
    scrim: 'rgba(2, 7, 14, 0.5)',
    modal: 'rgba(2, 7, 14, 0.62)',
    drawer: 'rgba(2, 7, 14, 0.56)'
  })
});

export const shadowTokensByMode = Object.freeze({
  light: Object.freeze({
    seed: '#0b172b',
    ambientAlpha: 0.018,
    ambientStep: 0.0025,
    ambientMax: 0.08,
    keyAlpha: 0.045,
    keyStep: 0.003,
    keyMax: 0.14
  }),
  dark: Object.freeze({
    seed: '#020711',
    ambientAlpha: 0.12,
    ambientStep: 0.0032,
    ambientMax: 0.24,
    keyAlpha: 0.18,
    keyStep: 0.0038,
    keyMax: 0.3
  })
});

export const shadowSurfaceTokensByMode = Object.freeze({
  light: Object.freeze({
    xs: '0 1px 2px rgba(11, 23, 43, 0.06), 0 6px 14px rgba(11, 23, 43, 0.04)',
    sm: '0 2px 6px rgba(11, 23, 43, 0.06), 0 10px 22px rgba(11, 23, 43, 0.05)',
    md: '0 4px 10px rgba(11, 23, 43, 0.07), 0 18px 32px rgba(11, 23, 43, 0.08)',
    lg: '0 8px 18px rgba(11, 23, 43, 0.08), 0 24px 44px rgba(11, 23, 43, 0.1)',
    xl: '0 14px 28px rgba(11, 23, 43, 0.1), 0 34px 60px rgba(11, 23, 43, 0.12)',
    focus: '0 0 0 1px rgba(58, 116, 245, 0.28), 0 0 0 4px rgba(58, 116, 245, 0.12), 0 14px 28px rgba(11, 23, 43, 0.1)',
    glow: '0 0 0 1px rgba(58, 116, 245, 0.16), 0 12px 28px rgba(58, 116, 245, 0.12)'
  }),
  dark: Object.freeze({
    xs: '0 1px 2px rgba(2, 7, 16, 0.22), 0 8px 16px rgba(2, 7, 16, 0.18)',
    sm: '0 2px 6px rgba(2, 7, 16, 0.24), 0 12px 22px rgba(2, 7, 16, 0.24)',
    md: '0 4px 10px rgba(2, 7, 16, 0.3), 0 20px 34px rgba(2, 7, 16, 0.34)',
    lg: '0 8px 18px rgba(2, 7, 16, 0.34), 0 28px 46px rgba(2, 7, 16, 0.4)',
    xl: '0 16px 28px rgba(2, 7, 16, 0.38), 0 36px 62px rgba(2, 7, 16, 0.48)',
    focus: '0 0 0 1px rgba(95, 146, 255, 0.38), 0 0 0 4px rgba(95, 146, 255, 0.16), 0 18px 34px rgba(2, 7, 16, 0.4)',
    glow: '0 0 0 1px rgba(95, 146, 255, 0.22), 0 16px 34px rgba(95, 146, 255, 0.14)'
  })
});

export const componentTokensByMode = Object.freeze({
  light: Object.freeze({
    card: Object.freeze({
      radius: radiusTokens.lg,
      padding: 24
    }),
    table: Object.freeze({
      radius: 20,
      rowHeight: 50,
      denseRowHeight: 40
    }),
    input: Object.freeze({
      radius: radiusTokens.sm,
      minHeight: 44
    }),
    button: Object.freeze({
      radius: 14,
      minHeight: 40,
      minHeightLg: 46
    }),
    badge: Object.freeze({
      radius: radiusTokens.pill
    }),
    dialog: Object.freeze({
      radius: radiusTokens.xl
    }),
    sidebar: Object.freeze({
      radius: 24,
      itemRadius: 16
    })
  }),
  dark: Object.freeze({
    card: Object.freeze({
      radius: radiusTokens.lg,
      padding: 24
    }),
    table: Object.freeze({
      radius: 20,
      rowHeight: 50,
      denseRowHeight: 40
    }),
    input: Object.freeze({
      radius: radiusTokens.sm,
      minHeight: 44
    }),
    button: Object.freeze({
      radius: 14,
      minHeight: 40,
      minHeightLg: 46
    }),
    badge: Object.freeze({
      radius: radiusTokens.pill
    }),
    dialog: Object.freeze({
      radius: radiusTokens.xl
    }),
    sidebar: Object.freeze({
      radius: 24,
      itemRadius: 16
    })
  })
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
      main: semanticScales.info[500],
      contrastText: '#ffffff'
    }),
    success: Object.freeze({
      main: semanticScales.success[500],
      contrastText: '#ffffff'
    }),
    warning: Object.freeze({
      main: semanticScales.warning[500],
      contrastText: '#fffaf0'
    }),
    error: Object.freeze({
      main: semanticScales.error[500],
      contrastText: '#ffffff'
    }),
    background: Object.freeze({
      default: surfaceTokensByMode.light.appCanvas,
      paper: '#ffffff'
    }),
    text: Object.freeze({
      primary: '#0b2540',
      secondary: '#53657b'
    }),
    divider: borderTokensByMode.light.standard,
    action: Object.freeze({
      hover: stateTokensByMode.light.hover,
      selected: stateTokensByMode.light.selected,
      disabledBackground: stateTokensByMode.light.disabledBg,
      disabled: stateTokensByMode.light.disabledText,
      focus: borderTokensByMode.light.focus
    })
  }),
  dark: Object.freeze({
    primary: Object.freeze({
      main: fintechBlue[400],
      light: fintechBlue[300],
      dark: fintechBlue[500],
      contrastText: '#f8fbff'
    }),
    secondary: Object.freeze({
      main: fintechDark[300],
      light: fintechDark[200],
      dark: fintechDark[500],
      contrastText: '#f4f8ff'
    }),
    info: Object.freeze({
      main: semanticScales.info[400],
      contrastText: '#f8fbff'
    }),
    success: Object.freeze({
      main: semanticScales.success[400],
      contrastText: '#f8fbff'
    }),
    warning: Object.freeze({
      main: semanticScales.warning[400],
      contrastText: '#fffaf0'
    }),
    error: Object.freeze({
      main: semanticScales.error[400],
      contrastText: '#fff5f5'
    }),
    background: Object.freeze({
      default: surfaceTokensByMode.dark.appCanvas,
      paper: fintechDark[900]
    }),
    text: Object.freeze({
      primary: '#f5f8fe',
      secondary: '#96a8bf'
    }),
    divider: borderTokensByMode.dark.standard,
    action: Object.freeze({
      hover: stateTokensByMode.dark.hover,
      selected: stateTokensByMode.dark.selected,
      disabledBackground: stateTokensByMode.dark.disabledBg,
      disabled: stateTokensByMode.dark.disabledText,
      focus: borderTokensByMode.dark.focus
    })
  })
});

export const typographyTokens = Object.freeze({
  fontFamily:
    "'Plus Jakarta Sans', 'IBM Plex Sans', 'SF Pro Text', 'SF Pro Display', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', sans-serif",
  h1: Object.freeze({
    fontWeight: 720,
    fontSize: '2.72rem',
    lineHeight: 1.02,
    letterSpacing: '-0.042em'
  }),
  h2: Object.freeze({
    fontWeight: 700,
    fontSize: '2.18rem',
    lineHeight: 1.08,
    letterSpacing: '-0.032em'
  }),
  h3: Object.freeze({
    fontWeight: 680,
    fontSize: '1.78rem',
    lineHeight: 1.14,
    letterSpacing: '-0.022em'
  }),
  h4: Object.freeze({
    fontWeight: 650,
    fontSize: '1.46rem',
    lineHeight: 1.22,
    letterSpacing: '-0.016em'
  }),
  h5: Object.freeze({
    fontWeight: 630,
    fontSize: '1.18rem',
    lineHeight: 1.3,
    letterSpacing: '-0.01em'
  }),
  h6: Object.freeze({
    fontWeight: 620,
    fontSize: '1.01rem',
    lineHeight: 1.4,
    letterSpacing: '-0.006em'
  }),
  subtitle1: Object.freeze({
    fontWeight: 560,
    fontSize: '1rem',
    lineHeight: 1.56,
    letterSpacing: '0.002em'
  }),
  subtitle2: Object.freeze({
    fontWeight: 560,
    fontSize: '0.9rem',
    lineHeight: 1.5,
    letterSpacing: '0.004em'
  }),
  body1: Object.freeze({
    fontWeight: 400,
    fontSize: '1rem',
    lineHeight: 1.66,
    letterSpacing: '0.003em'
  }),
  body2: Object.freeze({
    fontWeight: 400,
    fontSize: '0.9375rem',
    lineHeight: 1.6,
    letterSpacing: '0.003em'
  }),
  caption: Object.freeze({
    fontWeight: 500,
    fontSize: '0.79rem',
    lineHeight: 1.42,
    letterSpacing: '0.014em'
  }),
  overline: Object.freeze({
    fontWeight: 620,
    letterSpacing: '0.09em'
  }),
  button: Object.freeze({
    textTransform: 'none',
    fontWeight: 620,
    letterSpacing: '0.008em'
  })
});

export const typographyRoleTokens = Object.freeze({
  page: Object.freeze({
    title: Object.freeze({
      fontWeight: 700,
      fontSize: '2.26rem',
      lineHeight: 1.04,
      letterSpacing: '-0.04em'
    }),
    subtitle: Object.freeze({
      fontWeight: 500,
      fontSize: '1rem',
      lineHeight: 1.66,
      letterSpacing: '0.003em'
    })
  }),
  section: Object.freeze({
    title: Object.freeze({
      fontWeight: 640,
      fontSize: '1.04rem',
      lineHeight: 1.4,
      letterSpacing: '-0.008em'
    }),
    subtitle: Object.freeze({
      fontWeight: 500,
      fontSize: '0.875rem',
      lineHeight: 1.58,
      letterSpacing: '0.003em'
    })
  }),
  label: Object.freeze({
    default: Object.freeze({
      fontWeight: 620,
      fontSize: '0.73rem',
      lineHeight: 1.5,
      letterSpacing: '0.08em',
      textTransform: 'uppercase'
    }),
    subdued: Object.freeze({
      fontWeight: 540,
      fontSize: '0.75rem',
      lineHeight: 1.5,
      letterSpacing: '0.035em'
    })
  }),
  metric: Object.freeze({
    value: Object.freeze({
      fontWeight: 660,
      fontSize: '2.02rem',
      lineHeight: 1.02,
      letterSpacing: '-0.032em',
      fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
      fontVariantNumeric: 'tabular-nums lining-nums'
    }),
    delta: Object.freeze({
      fontWeight: 650,
      fontSize: '0.75rem',
      lineHeight: 1.5,
      letterSpacing: '0.03em',
      fontVariantNumeric: 'tabular-nums'
    }),
    label: Object.freeze({
      fontWeight: 620,
      fontSize: '0.72rem',
      lineHeight: 1.5,
      letterSpacing: '0.1em',
      textTransform: 'uppercase'
    })
  })
});

export const gradientTokensByMode = Object.freeze({
  light: Object.freeze({
    appBackground:
      'radial-gradient(circle at 0% 0%, rgba(58, 116, 245, 0.08) 0%, rgba(58, 116, 245, 0) 34%), radial-gradient(circle at 100% 8%, rgba(131, 168, 255, 0.08) 0%, rgba(131, 168, 255, 0) 30%), linear-gradient(180deg, #f5f8fc 0%, #edf3f9 100%)',
    appLoader:
      'radial-gradient(circle at 18% 10%, rgba(58, 116, 245, 0.1) 0%, transparent 34%), linear-gradient(180deg, #f5f8fc 0%, #edf3f9 100%)',
    authScreen:
      'radial-gradient(circle at 50% 0%, rgba(58, 116, 245, 0.1) 0%, rgba(58, 116, 245, 0) 44%), linear-gradient(180deg, #f5f8fc 0%, #edf3f9 100%)',
    brandMark: 'linear-gradient(135deg, #5a8eff 0%, #255dd7 100%)',
    cardSurface:
      'linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(247, 251, 255, 0.84) 100%)',
    cardSurfaceSoft:
      'linear-gradient(180deg, rgba(252, 254, 255, 0.92) 0%, rgba(244, 249, 255, 0.86) 100%)',
    sidebarBackground:
      'linear-gradient(180deg, rgba(252, 254, 255, 0.92) 0%, rgba(245, 249, 255, 0.88) 100%)',
    sidebarActiveGlow:
      'linear-gradient(90deg, rgba(58, 116, 245, 0.16) 0%, rgba(58, 116, 245, 0) 100%)',
    dashboardHero:
      'radial-gradient(circle at 88% 10%, rgba(58, 116, 245, 0.08) 0%, transparent 30%), linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(246, 250, 255, 0.88) 100%)',
    dashboardGlass:
      'linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(246, 250, 255, 0.86) 100%)',
    buttonPrimary:
      'linear-gradient(135deg, #5a8eff 0%, #255dd7 100%)',
    buttonSubtle:
      'linear-gradient(135deg, rgba(58, 116, 245, 0.1) 0%, rgba(58, 116, 245, 0.04) 100%)'
  }),
  dark: Object.freeze({
    appBackground:
      'radial-gradient(circle at 0% 0%, rgba(95, 146, 255, 0.12) 0%, rgba(95, 146, 255, 0) 34%), radial-gradient(circle at 100% 8%, rgba(95, 146, 255, 0.08) 0%, rgba(95, 146, 255, 0) 28%), linear-gradient(180deg, #07101c 0%, #0a1524 100%)',
    appLoader:
      'radial-gradient(circle at 18% 8%, rgba(95, 146, 255, 0.14) 0%, transparent 34%), linear-gradient(180deg, #07101c 0%, #0a1524 100%)',
    authScreen:
      'radial-gradient(circle at 50% 0%, rgba(95, 146, 255, 0.16) 0%, rgba(95, 146, 255, 0) 44%), linear-gradient(180deg, #07101c 0%, #0a1524 100%)',
    brandMark: 'linear-gradient(135deg, #7aa5ff 0%, #3a74f5 100%)',
    cardSurface:
      'linear-gradient(180deg, rgba(15, 27, 45, 0.9) 0%, rgba(10, 19, 34, 0.84) 100%)',
    cardSurfaceSoft:
      'linear-gradient(180deg, rgba(18, 31, 50, 0.88) 0%, rgba(12, 22, 38, 0.84) 100%)',
    sidebarBackground:
      'linear-gradient(180deg, rgba(12, 22, 37, 0.92) 0%, rgba(8, 16, 29, 0.9) 100%)',
    sidebarActiveGlow:
      'linear-gradient(90deg, rgba(95, 146, 255, 0.2) 0%, rgba(95, 146, 255, 0) 100%)',
    dashboardHero:
      'radial-gradient(circle at 88% 10%, rgba(95, 146, 255, 0.14) 0%, transparent 30%), linear-gradient(180deg, rgba(16, 28, 46, 0.9) 0%, rgba(11, 20, 35, 0.86) 100%)',
    dashboardGlass:
      'linear-gradient(180deg, rgba(16, 28, 46, 0.88) 0%, rgba(11, 20, 35, 0.84) 100%)',
    buttonPrimary:
      'linear-gradient(135deg, #6a9bff 0%, #3a74f5 100%)',
    buttonSubtle:
      'linear-gradient(135deg, rgba(95, 146, 255, 0.16) 0%, rgba(95, 146, 255, 0.08) 100%)'
  })
});
