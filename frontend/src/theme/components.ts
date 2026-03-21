import { alpha } from '@mui/material/styles';
import { getGradients } from './gradients';
import {
  layoutTokens,
  motionTokens,
  shapeTokens,
  spacingTokens,
  typographyRoleTokens
} from './tokens';

const getVisualTokens = (theme) => theme.palette.custom || {};

const buildGlassSurface = (
  theme,
  {
    radius,
    borderAlpha = 0.1,
    backgroundAlpha = 0.92,
    blur,
    shadowAlpha = 0.1,
    backgroundColor,
    borderColor,
    shadow
  } = {}
) => {
  const resolvedRadius = radius ?? shapeTokens.cardRadius;
  const visual = getVisualTokens(theme);
  const surface = visual.surface || {};
  const border = visual.border || {};
  const shadowTokens = visual.shadow || {};
  const blurTokens = visual.blur || {};
  const resolvedBlur = blur ?? blurTokens.md ?? 14;
  const resolvedSaturate = surface.saturate ?? 140;

  return {
    borderRadius: resolvedRadius,
    border: `1px solid ${borderColor || border.soft || alpha(theme.palette.text.primary, borderAlpha)}`,
    backgroundColor:
      backgroundColor ||
      alpha(theme.palette.background.paper, backgroundAlpha),
    backdropFilter: `blur(${resolvedBlur}px) saturate(${resolvedSaturate}%)`,
    WebkitBackdropFilter: `blur(${resolvedBlur}px) saturate(${resolvedSaturate}%)`,
    boxShadow:
      shadow ||
      shadowTokens.md ||
      `0 12px 28px ${alpha(theme.palette.text.primary, shadowAlpha)}`
  };
};

export const getComponents = (mode = 'light') => {
  const isLight = mode === 'light';
  const gradients = getGradients(mode);
  const cardRadius = shapeTokens.cardRadius;
  const inputRadius = shapeTokens.inputRadius;
  const cardPadding = spacingTokens.cardPadding;
  const microMotionMs = motionTokens.microDurationMs;
  const microMotion = motionTokens.micro;

  const containerTokens = layoutTokens.container;
  const pageTokens = layoutTokens.page;
  const gridTokens = layoutTokens.grid;

  const contentMaxWidth = containerTokens.maxWidth;
  const pageGap = pageTokens.gap;
  const sectionGap = pageTokens.sectionGap;
  const sectionDenseGap = pageTokens.sectionDenseGap;
  const pageHeaderGap = pageTokens.headerGap;
  const pageHeaderCopyGap = pageTokens.headerCopyGap;
  const pageHeaderActionsGap = pageTokens.headerActionsGap;
  const pageFooterMarginTop = pageTokens.footerMarginTop;
  const pageGridGap = gridTokens.gap;
  const pageGridColumns = gridTokens.columns;
  const containerPaddingY = containerTokens.paddingY;
  const containerPaddingX = containerTokens.paddingX;

  const pageTypography = typographyRoleTokens.page;
  const sectionTypography = typographyRoleTokens.section;
  const labelTypography = typographyRoleTokens.label;
  const metricTypography = typographyRoleTokens.metric;

  const getCardBorder = (theme) => {
    const border = getVisualTokens(theme).border || {};
    return `1px solid ${border.soft || alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14)}`;
  };

  const getCardShadow = (theme) => {
    const shadow = getVisualTokens(theme).shadow || {};
    return shadow.md || `0 12px 28px ${alpha(theme.palette.text.primary, isLight ? 0.08 : 0.2)}`;
  };

  const getHoverLiftShadow = (theme) => {
    const shadow = getVisualTokens(theme).shadow || {};
    return shadow.lg || `0 16px 34px ${alpha(theme.palette.text.primary, isLight ? 0.1 : 0.24)}`;
  };

  const getHoverLift = (theme) => ({
    transition: `transform ${microMotion}, box-shadow ${microMotion}, border-color ${microMotion}`,
    '&:hover': {
      transform: 'translateY(-1px)',
      boxShadow: getHoverLiftShadow(theme)
    }
  });

  const getPanelChrome = (theme, { accent = true } = {}) => ({
    position: 'relative',
    overflow: 'hidden',
    '&::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, isLight ? 0.18 : 0.04)} 0%, transparent 30%)`
    },
    '&::after':
      accent
        ? {
            content: '""',
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: `radial-gradient(circle at 100% 0%, ${alpha(theme.palette.primary.main, isLight ? 0.06 : 0.1)} 0%, transparent 34%)`
          }
        : undefined
  });

  const getCardSurface = (theme, { soft = false } = {}) => ({
    ...buildGlassSurface(theme, {
      borderAlpha: soft ? (isLight ? 0.08 : 0.14) : isLight ? 0.1 : 0.16,
      backgroundAlpha: soft ? (isLight ? 0.95 : 0.92) : isLight ? 0.97 : 0.94,
      blur: soft ? 14 : 10,
      shadowAlpha: soft ? (isLight ? 0.08 : 0.18) : isLight ? 0.1 : 0.2,
      backgroundColor: (getVisualTokens(theme).surface || {})[soft ? 'cardSoft' : 'card']
    }),
    ...getPanelChrome(theme),
    backgroundImage: soft ? gradients.cardSurfaceSoft : gradients.cardSurface,
    boxShadow: getCardShadow(theme),
    border: getCardBorder(theme)
  });

  const getDashboardGlass = (theme) => ({
    ...buildGlassSurface(theme, {
      borderAlpha: isLight ? 0.09 : 0.16,
      backgroundAlpha: isLight ? 0.96 : 0.94,
      blur: 14,
      shadowAlpha: isLight ? 0.09 : 0.2,
      backgroundColor: (getVisualTokens(theme).surface || {}).cardSoft
    }),
    backgroundImage: gradients.dashboardGlass,
    border: getCardBorder(theme),
    boxShadow: getCardShadow(theme)
  });

  const getTableSurface = (theme) => ({
    ...buildGlassSurface(theme, {
      radius: 18,
      borderAlpha: isLight ? 0.08 : 0.14,
      backgroundAlpha: isLight ? 0.97 : 0.93,
      blur: 10,
      shadowAlpha: isLight ? 0.08 : 0.18,
      backgroundColor: (getVisualTokens(theme).surface || {}).table
    }),
    backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, isLight ? 0.98 : 0.96)} 0%, ${alpha(theme.palette.background.default, isLight ? 0.94 : 0.9)} 100%)`,
    border: getCardBorder(theme),
    boxShadow: getCardShadow(theme),
    overflow: 'hidden'
  });

  const getInsetSurface = (
    theme,
    {
      radius = 16,
      backgroundAlpha = isLight ? 0.76 : 0.58,
      borderAlpha = isLight ? 0.08 : 0.14,
      shadowAlpha = isLight ? 0.05 : 0.12
    } = {}
  ) => ({
    ...buildGlassSurface(theme, {
      radius,
      borderAlpha,
      backgroundAlpha,
      blur: 8,
      shadowAlpha,
      backgroundColor: alpha(theme.palette.background.paper, backgroundAlpha)
    }),
    backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, isLight ? 0.84 : 0.72)} 0%, ${alpha(theme.palette.background.default, isLight ? 0.72 : 0.52)} 100%)`,
    boxShadow: (getVisualTokens(theme).shadow || {}).xs || `0 8px 18px ${alpha(theme.palette.text.primary, isLight ? 0.05 : 0.12)}`,
    border: `1px solid ${alpha(theme.palette.text.primary, borderAlpha)}`
  });

  const getCompactMetricSurface = (theme) => ({
    ...getInsetSurface(theme, {
      radius: 16,
      backgroundAlpha: isLight ? 0.82 : 0.64,
      borderAlpha: isLight ? 0.08 : 0.14,
      shadowAlpha: isLight ? 0.05 : 0.12
    }),
    minHeight: 92,
    padding: theme.spacing(1.1, 1.3)
  });

  return {
    MuiCssBaseline: {
      styleOverrides: (theme) => {
        const visual = getVisualTokens(theme);
        const surface = visual.surface || {};
        const border = visual.border || {};
        const state = visual.state || {};
        const overlay = visual.overlay || {};
        const shadow = visual.shadow || {};
        const component = visual.component || {};
        const blur = visual.blur || {};
        const sidebarTextPrimary = theme.palette.text.primary;
        const sidebarTextSecondary = alpha(theme.palette.text.secondary, 0.88);
        const sidebarIconColor = alpha(theme.palette.text.secondary, 0.9);
        const sidebarActiveIndicator = theme.palette.primary.main;
        const sidebarHoverBackground = state.hover || alpha(theme.palette.primary.main, isLight ? 0.06 : 0.12);
        const sidebarActiveBackground = state.selected || alpha(theme.palette.primary.main, isLight ? 0.12 : 0.2);
        const sidebarDivider = border.soft || alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14);
        const sidebarSurfaceBorder = border.soft || alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14);
        const headerSurface = surface.header || alpha(theme.palette.background.paper, isLight ? 0.88 : 0.82);
        const headerBorder = border.soft || alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14);

        return {
          '@keyframes crm-fade-in': {
            '0%': {
              opacity: 0,
              transform: 'translateY(8px)'
            },
            '100%': {
              opacity: 1,
              transform: 'translateY(0)'
            }
          },
          '@keyframes crm-soft-float': {
            '0%': {
              transform: 'translateY(0px)'
            },
            '50%': {
              transform: 'translateY(-4px)'
            },
            '100%': {
              transform: 'translateY(0px)'
            }
          },
          '@keyframes crm-modal-enter': {
            '0%': {
              opacity: 0,
              transform: 'translateY(10px) scale(0.96)',
              filter: 'blur(2px)'
            },
            '100%': {
              opacity: 1,
              transform: 'translateY(0) scale(1)',
              filter: 'blur(0)'
            }
          },
          '*, *::before, *::after': {
            boxSizing: 'border-box'
          },
          body: {
            margin: 0,
            backgroundColor: theme.palette.background.default,
            backgroundImage: gradients.appBackground,
            backgroundAttachment: 'fixed',
            color: theme.palette.text.primary,
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale'
          },
          '::selection': {
            backgroundColor: alpha(theme.palette.primary.main, 0.24)
          },
          '#root': {
            minHeight: '100vh'
          },

          '.MuiBox-root.crm-app-loader': {
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing(4),
            backgroundImage: gradients.appLoader,
            animation: `crm-fade-in ${microMotion}`
          },
          '.MuiStack-root.crm-app-loader__panel': {
            ...getCardSurface(theme, { soft: true }),
            width: '100%',
            maxWidth: 420,
            alignItems: 'center',
            textAlign: 'center',
            gap: theme.spacing(1.5),
            padding: theme.spacing(2.4, 2.3),
            boxShadow: shadow.lg || getCardShadow(theme)
          },
          '.MuiBox-root.crm-app-loader__spinner-shell': {
            ...getInsetSurface(theme, {
              radius: 18,
              backgroundAlpha: isLight ? 0.82 : 0.62,
              borderAlpha: isLight ? 0.08 : 0.14
            }),
            width: 58,
            height: 58,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0
          },
          '.MuiTypography-root.crm-app-loader__eyebrow': {
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: alpha(theme.palette.primary.main, 0.86)
          },
          '.MuiTypography-root.crm-app-loader__message': {
            maxWidth: 320,
            color: alpha(theme.palette.text.secondary, 0.94)
          },

          '.MuiContainer-root.crm-page-container': {
            width: '100%',
            maxWidth: `${contentMaxWidth}px !important`,
            marginLeft: 'auto',
            marginRight: 'auto',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(Math.max(pageGap - 1.4, 1.4)),
            paddingTop: theme.spacing(Math.max(containerPaddingY.xs - 1.9, 0.75)),
            paddingBottom: theme.spacing(Math.max(containerPaddingY.xs - 0.9, 1.25)),
            paddingLeft: theme.spacing(containerPaddingX.xs),
            paddingRight: theme.spacing(containerPaddingX.xs),
            [theme.breakpoints.up('md')]: {
              paddingTop: theme.spacing(Math.max(containerPaddingY.md - 2.45, 1)),
              paddingBottom: theme.spacing(Math.max(containerPaddingY.md - 1.4, 1.8)),
              paddingLeft: theme.spacing(containerPaddingX.md),
              paddingRight: theme.spacing(containerPaddingX.md)
            },
            [theme.breakpoints.up('sm')]: {
              paddingLeft: theme.spacing(containerPaddingX.sm || containerPaddingX.xs),
              paddingRight: theme.spacing(containerPaddingX.sm || containerPaddingX.xs)
            }
          },

          '.MuiTypography-root.crm-text-strong': {
            fontWeight: 620
          },
          '.MuiTypography-root.crm-text-medium': {
            fontWeight: 560
          },
          '.MuiTypography-root.crm-text-uppercase': {
            textTransform: 'uppercase',
            letterSpacing: '0.07em'
          },

          '.MuiTypography-root.crm-page-title': {
            fontWeight: pageTypography.title.fontWeight,
            fontSize: 'clamp(1.36rem, 1.55vw, 1.72rem)',
            lineHeight: 1.04,
            letterSpacing: pageTypography.title.letterSpacing,
            color: theme.palette.text.primary
          },
          '.MuiTypography-root.crm-page-subtitle': {
            fontWeight: pageTypography.subtitle.fontWeight,
            fontSize: '0.9rem',
            lineHeight: 1.48,
            letterSpacing: pageTypography.subtitle.letterSpacing,
            color: theme.palette.text.secondary,
            maxWidth: 620
          },
          '.MuiTypography-root.crm-section-title': {
            fontWeight: sectionTypography.title.fontWeight,
            fontSize: sectionTypography.title.fontSize,
            lineHeight: sectionTypography.title.lineHeight,
            letterSpacing: sectionTypography.title.letterSpacing,
            color: theme.palette.text.primary
          },
          '.MuiTypography-root.crm-section-subtitle': {
            fontWeight: sectionTypography.subtitle.fontWeight,
            fontSize: sectionTypography.subtitle.fontSize,
            lineHeight: sectionTypography.subtitle.lineHeight,
            letterSpacing: sectionTypography.subtitle.letterSpacing,
            color: theme.palette.text.secondary
          },
          '.MuiTypography-root.crm-label': {
            fontWeight: labelTypography.default.fontWeight,
            fontSize: labelTypography.default.fontSize,
            lineHeight: labelTypography.default.lineHeight,
            letterSpacing: labelTypography.default.letterSpacing,
            textTransform: labelTypography.default.textTransform
          },
          '.MuiTypography-root.crm-label--subdued': {
            fontWeight: labelTypography.subdued.fontWeight,
            fontSize: labelTypography.subdued.fontSize,
            lineHeight: labelTypography.subdued.lineHeight,
            letterSpacing: labelTypography.subdued.letterSpacing
          },
          '.MuiTypography-root.crm-metric-value': {
            fontWeight: metricTypography.value.fontWeight,
            fontSize: metricTypography.value.fontSize,
            lineHeight: metricTypography.value.lineHeight,
            letterSpacing: metricTypography.value.letterSpacing,
            fontFamily: metricTypography.value.fontFamily,
            fontVariantNumeric: metricTypography.value.fontVariantNumeric
          },
          '.MuiTypography-root.crm-metric-delta': {
            fontWeight: metricTypography.delta.fontWeight,
            fontSize: metricTypography.delta.fontSize,
            lineHeight: metricTypography.delta.lineHeight,
            letterSpacing: metricTypography.delta.letterSpacing,
            fontVariantNumeric: metricTypography.delta.fontVariantNumeric
          },
          '.MuiTypography-root.crm-metric-label': {
            fontWeight: metricTypography.label.fontWeight,
            fontSize: metricTypography.label.fontSize,
            lineHeight: metricTypography.label.lineHeight,
            letterSpacing: metricTypography.label.letterSpacing,
            textTransform: metricTypography.label.textTransform
          },

          '.MuiBox-root.crm-empty-state': {
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            padding: theme.spacing(1)
          },
          '.MuiPaper-root.crm-empty-state__panel': {
            ...getInsetSurface(theme, {
              radius: 22,
              backgroundAlpha: isLight ? 0.8 : 0.62,
              borderAlpha: isLight ? 0.08 : 0.14
            }),
            width: '100%',
            maxWidth: 440,
            padding: theme.spacing(2.2, 1.8),
            textAlign: 'center',
            [theme.breakpoints.down('sm')]: {
              padding: theme.spacing(1.8, 1.2)
            }
          },
          '.MuiBox-root.crm-empty-state__icon-shell': {
            width: 52,
            height: 52,
            margin: '0 auto',
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: gradients.buttonSubtle,
            border: `1px solid ${alpha(theme.palette.primary.main, isLight ? 0.14 : 0.24)}`,
            boxShadow: shadow.xs || `0 8px 16px ${alpha(theme.palette.primary.main, isLight ? 0.06 : 0.14)}`
          },
          '.MuiBox-root.crm-empty-state__icon-shell .crm-empty-state__icon': {
            color: theme.palette.primary.main
          },
          '.MuiStack-root.crm-empty-state__copy': {
            maxWidth: 320,
            marginLeft: 'auto',
            marginRight: 'auto',
            gap: theme.spacing(0.55)
          },
          '.MuiTypography-root.crm-empty-state__eyebrow': {
            fontWeight: 650,
            letterSpacing: '0.08em',
            color: alpha(theme.palette.primary.main, 0.84)
          },
          '.MuiTypography-root.crm-empty-state__title': {
            fontWeight: 650,
            letterSpacing: '-0.016em',
            color: theme.palette.text.primary
          },
          '.MuiTypography-root.crm-empty-state__description': {
            color: alpha(theme.palette.text.secondary, 0.94)
          },
          '.MuiBox-root.crm-empty-state__action': {
            marginTop: theme.spacing(0.35)
          },
          '.MuiStack-root.crm-table-loading': {
            padding: theme.spacing(2)
          },
          '.MuiLinearProgress-root.crm-progress-compact': {
            width: 120
          },
          '.MuiTableRow-root.crm-table__row--skeleton .MuiBox-root.crm-table__skeleton-stack': {
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(0.45)
          },
          '.MuiTableRow-root.crm-table__row--skeleton .MuiBox-root.crm-table__skeleton-actions': {
            display: 'flex',
            justifyContent: 'flex-end',
            gap: theme.spacing(0.45)
          },

          '.MuiTypography-root.crm-table-indicator': {
            fontWeight: 650,
            fontVariantNumeric: 'tabular-nums'
          },
          '.MuiTypography-root.crm-table-indicator--positive': {
            color: theme.palette.success.main
          },
          '.MuiTypography-root.crm-table-indicator--negative': {
            color: theme.palette.error.main
          },

          '.MuiStack-root.crm-dialog-stack': {
            marginTop: theme.spacing(1)
          },

          '.MuiBox-root.crm-brand': {
            display: 'inline-flex',
            alignItems: 'center',
            gap: theme.spacing(1.35)
          },
          '.MuiBox-root.crm-brand__copy': {
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            gap: theme.spacing(0.15)
          },
          '.MuiBox-root.crm-brand__mark': {
            width: 16,
            height: 16,
            borderRadius: 6,
            background: gradients.brandMark,
            display: 'grid',
            placeItems: 'center',
            boxShadow: `0 8px 18px ${alpha(theme.palette.primary.main, isLight ? 0.18 : 0.28)}`,
            animation: 'crm-soft-float 7s ease-in-out infinite'
          },
          '.MuiBox-root.crm-brand__mark-core': {
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: alpha('#FFFFFF', isLight ? 0.9 : 0.82)
          },
          '.MuiTypography-root.crm-brand__text': {
            fontWeight: 700,
            letterSpacing: '-0.016em'
          },
          '.MuiTypography-root.crm-brand__tagline': {
            color: alpha(theme.palette.text.secondary, 0.92),
            fontWeight: 560,
            letterSpacing: '0.01em',
            lineHeight: 1.3
          },

          '.MuiStack-root.crm-form': {
            width: '100%',
            gap: theme.spacing(1.6)
          },
          '.MuiFormControl-root.crm-form__field': {
            margin: 0,
            width: '100%'
          },
          '.MuiStack-root.crm-form__section': {
            position: 'relative',
            gap: theme.spacing(1),
            padding: theme.spacing(1.05, 1.1, 1.15),
            borderRadius: 18,
            border: `1px solid ${alpha(theme.palette.text.primary, isLight ? 0.06 : 0.12)}`,
            background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, isLight ? 0.72 : 0.5)} 0%, ${alpha(theme.palette.background.default, isLight ? 0.34 : 0.18)} 100%)`,
            boxShadow: `0 8px 18px ${alpha(theme.palette.text.primary, isLight ? 0.04 : 0.12)}`
          },
          '.MuiStack-root.crm-form__section-header': {
            gap: theme.spacing(0.3)
          },
          '.MuiTypography-root.crm-form__section-title': {
            fontWeight: 640,
            fontSize: theme.typography.subtitle1.fontSize,
            letterSpacing: '-0.01em',
            color: theme.palette.text.primary
          },
          '.MuiTypography-root.crm-form__section-subtitle': {
            color: theme.palette.text.secondary,
            fontSize: theme.typography.body2.fontSize,
            lineHeight: 1.56
          },
          '.MuiBox-root.crm-form__grid': {
            display: 'grid',
            gap: theme.spacing(1),
            gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
            [theme.breakpoints.up('sm')]: {
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
            }
          },
          '.MuiStack-root.crm-form__stack': {
            gap: theme.spacing(1)
          },
          '.MuiStack-root.crm-form__toggle-row': {
            gap: theme.spacing(0.8),
            alignItems: 'center',
            flexWrap: 'wrap'
          },
          '.MuiStack-root.crm-form__compact-actions': {
            gap: theme.spacing(1),
            justifyContent: 'flex-end',
            alignItems: 'center',
            flexWrap: 'wrap'
          },
          '.MuiStack-root.crm-form__selection-list': {
            gap: theme.spacing(1)
          },
          '.MuiBox-root.crm-form__selection-item': {
            borderRadius: 16,
            border: `1px solid ${alpha(theme.palette.text.primary, isLight ? 0.06 : 0.12)}`,
            background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, isLight ? 0.76 : 0.54)} 0%, ${alpha(theme.palette.background.default, isLight ? 0.4 : 0.24)} 100%)`,
            boxShadow: `0 8px 16px ${alpha(theme.palette.text.primary, isLight ? 0.04 : 0.12)}`,
            padding: theme.spacing(1.1, 1.2),
            transition: theme.transitions.create(
              ['border-color', 'box-shadow', 'background-color', 'transform'],
              { duration: microMotionMs }
            )
          },
          '.MuiBox-root.crm-form__selection-item--selected': {
            borderColor: alpha(theme.palette.primary.main, isLight ? 0.22 : 0.34),
            boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main, isLight ? 0.12 : 0.2)}, 0 12px 22px ${alpha(theme.palette.primary.main, isLight ? 0.08 : 0.12)}`
          },
          '.MuiBox-root.crm-form__selection-item:hover': {
            borderColor: alpha(theme.palette.primary.main, isLight ? 0.18 : 0.28),
            transform: 'translateY(-1px)'
          },
          '.MuiBox-root.crm-form__selection-item .MuiFormControlLabel-root': {
            width: '100%',
            alignItems: 'flex-start'
          },
          '.MuiBox-root.crm-form__scroll': {
            maxHeight: 320,
            overflowY: 'auto',
            paddingRight: theme.spacing(0.25)
          },
          '.MuiTypography-root.crm-form__note, .MuiTypography-root.crm-form__hint': {
            color: theme.palette.text.secondary,
            fontSize: theme.typography.caption.fontSize,
            lineHeight: 1.54
          },
          '.MuiStack-root.crm-form__actions': {
            marginTop: theme.spacing(0.8),
            justifyContent: 'flex-end',
            alignItems: 'center',
            flexWrap: 'wrap',
            '& > *': {
              width: '100%'
            },
            [theme.breakpoints.up('sm')]: {
              '& > *': {
                width: 'auto'
              }
            }
          },
          '.MuiPaper-root.crm-auth-card .MuiStack-root.crm-form__actions, .MuiStack-root.crm-auth-form__actions': {
            marginTop: theme.spacing(0.5),
            justifyContent: 'stretch'
          },
          '.MuiStack-root.crm-auth-form': {
            width: '100%',
            gap: theme.spacing(1.7)
          },
          '.MuiTypography-root.crm-auth-form__section-title': {
            fontWeight: 620,
            fontSize: theme.typography.subtitle2.fontSize,
            letterSpacing: '0.01em',
            color: theme.palette.text.secondary
          },

          '.MuiBox-root.crm-global-search': {
            position: 'relative',
            width: '100%'
          },
          '.MuiPaper-root.crm-global-search__input-shell': {
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing(1.1),
            padding: theme.spacing(0.5, 1.25),
            borderRadius: 16,
            border: `1px solid ${alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14)}`,
            backgroundColor: surface.floating || alpha(theme.palette.background.paper, isLight ? 0.96 : 0.9),
            backdropFilter: `blur(${blur.xs || 6}px) saturate(${surface.saturate || 140}%)`,
            WebkitBackdropFilter: `blur(${blur.xs || 6}px) saturate(${surface.saturate || 140}%)`,
            boxShadow: shadow.xs || `0 8px 18px ${alpha(theme.palette.text.primary, isLight ? 0.06 : 0.18)}`,
            transition: theme.transitions.create(['border-color', 'box-shadow', 'transform'], {
              duration: microMotionMs
            }),
            minWidth: 0
          },
          '.MuiPaper-root.crm-global-search__input-shell--active': {
            borderColor: alpha(theme.palette.primary.main, isLight ? 0.36 : 0.48),
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, isLight ? 0.14 : 0.22)}, 0 10px 24px ${alpha(theme.palette.text.primary, isLight ? 0.08 : 0.2)}`,
            transform: 'translateY(-1px)'
          },
          '.MuiInputBase-root.crm-global-search__input': {
            flex: 1,
            fontSize: '0.875rem',
            '& .MuiInputBase-input': {
              padding: theme.spacing(0.9, 0)
            }
          },
          '.MuiPaper-root.crm-global-search__input-shell .crm-global-search__input-icon': {
            color: alpha(theme.palette.text.secondary, isLight ? 0.88 : 0.96)
          },
          '.MuiCircularProgress-root.crm-global-search__spinner': {
            color: theme.palette.primary.main
          },
          '.MuiPopper-root.crm-global-search__popper': {
            width: '100%',
            maxWidth: 540,
            zIndex: theme.zIndex.tooltip + 1
          },
          '.MuiPaper-root.crm-global-search__panel': {
            marginTop: theme.spacing(1),
            ...buildGlassSurface(theme, {
              borderAlpha: isLight ? 0.08 : 0.14,
              backgroundAlpha: isLight ? 0.96 : 0.92,
              blur: 10,
              shadowAlpha: isLight ? 0.08 : 0.18
            }),
            backgroundImage: gradients.cardSurfaceSoft,
            overflow: 'hidden'
          },
          '.MuiList-root.crm-global-search__list': {
            padding: 0
          },
          '.MuiListItemButton-root.crm-global-search__item': {
            padding: theme.spacing(1.1, 1.4),
            gap: theme.spacing(1.2),
            transition: theme.transitions.create(['background-color', 'transform'], {
              duration: microMotionMs
            }),
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.08 : 0.18)
            },
            '&:not(:last-of-type)': {
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.9)}`
            }
          },
          '.MuiListItemIcon-root.crm-global-search__item-icon': {
            minWidth: 0,
            color: theme.palette.text.secondary
          },
          '.MuiBox-root.crm-global-search__item-meta': {
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing(0.5),
            color: theme.palette.text.secondary
          },
          '.MuiTypography-root.crm-global-search__type-label': {
            fontSize: theme.typography.caption.fontSize,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            padding: theme.spacing(0.28, 0.9),
            borderRadius: 999,
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.08 : 0.16)
          },
          '.MuiStack-root.crm-global-search__state': {
            padding: theme.spacing(2)
          },

          '.MuiBox-root.crm-table-shell__toolbar': {
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(0.9),
            padding: theme.spacing(1.45, 1.7, 1.2),
            borderBottom: `1px solid ${border.soft || alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14)}`,
            background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, isLight ? 0.88 : 0.76)} 0%, ${alpha(theme.palette.background.default, isLight ? 0.36 : 0.26)} 100%)`,
            [theme.breakpoints.down('sm')]: {
              padding: theme.spacing(1.1, 1.1, 1)
            }
          },
          '.MuiBox-root.crm-table-shell__toolbar::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, isLight ? 0.22 : 0.04)} 0%, transparent 42%)`
          },
          '.MuiBox-root.crm-table-toolbar': {
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(0.8)
          },
          '.MuiStack-root.crm-table-toolbar__top': {
            gap: theme.spacing(0.8),
            [theme.breakpoints.up('md')]: {
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between'
            }
          },
          '.MuiStack-root.crm-table-toolbar__main': {
            minWidth: 0,
            flex: '1 1 auto',
            gap: theme.spacing(0.35)
          },
          '.MuiTypography-root.crm-table-toolbar__eyebrow': {
            fontWeight: labelTypography.default.fontWeight,
            fontSize: labelTypography.default.fontSize,
            lineHeight: labelTypography.default.lineHeight,
            letterSpacing: labelTypography.default.letterSpacing,
            textTransform: labelTypography.default.textTransform,
            color: alpha(theme.palette.text.secondary, 0.9)
          },
          '.MuiTypography-root.crm-table-toolbar__title': {
            fontWeight: 650,
            fontSize: theme.typography.h6.fontSize,
            letterSpacing: '-0.012em',
            color: theme.palette.text.primary
          },
          '.MuiTypography-root.crm-table-toolbar__subtitle': {
            fontWeight: 500,
            fontSize: theme.typography.body2.fontSize,
            lineHeight: 1.58,
            color: theme.palette.text.secondary,
            maxWidth: 820
          },
          '.MuiStack-root.crm-table-toolbar__actions': {
            flexShrink: 0,
            gap: theme.spacing(0.8),
            flexWrap: 'wrap',
            alignItems: 'center',
            [theme.breakpoints.down('sm')]: {
              width: '100%'
            }
          },
          '.MuiStack-root.crm-table-toolbar__controls': {
            gap: theme.spacing(0.8),
            alignItems: 'stretch',
            [theme.breakpoints.up('lg')]: {
              flexDirection: 'row',
              alignItems: 'flex-start'
            }
          },
          '.MuiBox-root.crm-table-toolbar__search': {
            minWidth: 0,
            flex: '1 1 360px',
            maxWidth: '100%'
          },
          '.MuiTextField-root.crm-table-toolbar__search-field': {
            width: '100%'
          },
          '.MuiTextField-root.crm-table-toolbar__search-field .MuiInputAdornment-positionStart .MuiSvgIcon-root, .MuiTextField-root.crm-table-toolbar__search-field .MuiInputAdornment-positionStart .crm-icon, .MuiTextField-root.crm-table-toolbar__search-field .MuiInputAdornment-positionEnd .MuiSvgIcon-root, .MuiTextField-root.crm-table-toolbar__search-field .MuiInputAdornment-positionEnd .crm-icon': {
            color: alpha(theme.palette.text.secondary, 0.86)
          },
          '.MuiTextField-root.crm-table-toolbar__search-field .MuiFormHelperText-root': {
            marginTop: theme.spacing(0.65)
          },
          '.MuiStack-root.crm-table-toolbar__filters': {
            gap: theme.spacing(0.85),
            flexWrap: 'wrap',
            alignItems: 'center',
            flex: '1 1 280px',
            minWidth: 0
          },
          '.MuiStack-root.crm-table-toolbar__filters .MuiFormControlLabel-root': {
            margin: 0,
            padding: theme.spacing(0.2, 0.25),
            borderRadius: 999,
            alignItems: 'center'
          },
          '.MuiStack-root.crm-table-toolbar__filters .MuiTypography-root': {
            maxWidth: '100%'
          },
          '.MuiStack-root.crm-table-toolbar__meta': {
            gap: theme.spacing(0.75),
            flexWrap: 'wrap',
            alignItems: 'center'
          },

          '.MuiBox-root.crm-auth-screen': {
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing(4, 2),
            backgroundImage: gradients.authScreen,
            animation: `crm-fade-in ${microMotion}`
          },
          '.MuiPaper-root.crm-auth-card': {
            width: '100%',
            maxWidth: 520,
            margin: '0 auto',
            animation: `crm-fade-in ${microMotion}`,
            boxShadow: shadow.lg || getCardShadow(theme)
          },
          '.MuiStack-root.crm-auth-header': {
            textAlign: 'center',
            alignItems: 'center'
          },
          '.MuiBox-root.crm-auth-logo': {
            display: 'flex',
            justifyContent: 'center'
          },
          '.crm-auth-logo .MuiBox-root.crm-brand__mark': {
            width: 20,
            height: 20,
            borderRadius: 8
          },
          '.crm-auth-logo .MuiTypography-root.crm-brand__text': {
            fontSize: theme.typography.h6.fontSize
          },
          '.crm-auth-logo .MuiTypography-root.crm-brand__tagline': {
            fontSize: '0.69rem'
          },
          '.MuiStack-root.crm-auth-footer': {
            textAlign: 'center',
            alignItems: 'center'
          },
          '.MuiLink-root.crm-auth-link': {
            fontSize: theme.typography.caption.fontSize,
            fontWeight: 620,
            color: theme.palette.text.primary
          },

          '.MuiAlert-root.crm-alert--spaced': {
            marginBottom: theme.spacing(2)
          },
          '.MuiAlert-root.crm-alert--full-width': {
            width: '100%'
          },
          '.MuiAlert-root.crm-notify-alert': {
            alignItems: 'flex-start'
          },

          '.MuiBox-root.crm-app-shell': {
            position: 'relative',
            isolation: 'isolate',
            display: 'flex',
            minHeight: '100vh',
            backgroundColor: 'transparent',
            animation: `crm-fade-in ${microMotion}`,
            '&::before': {
              content: '""',
              position: 'fixed',
              inset: 0,
              zIndex: -2,
              pointerEvents: 'none',
              backgroundImage: gradients.appBackground
            },
            '&::after': {
              content: '""',
              position: 'fixed',
              inset: 0,
              zIndex: -1,
              pointerEvents: 'none',
              background:
                isLight
                  ? 'radial-gradient(circle at 18% 12%, rgba(58, 116, 245, 0.06) 0%, transparent 32%), radial-gradient(circle at 86% 8%, rgba(131, 168, 255, 0.08) 0%, transparent 26%)'
                  : 'radial-gradient(circle at 18% 12%, rgba(95, 146, 255, 0.12) 0%, transparent 32%), radial-gradient(circle at 86% 8%, rgba(95, 146, 255, 0.08) 0%, transparent 26%)'
            }
          },
          '.MuiBox-root.crm-app-shell__main': {
            flexGrow: 1,
            width: '100%',
            minHeight: '100vh',
            backgroundColor: 'transparent',
            paddingBottom: theme.spacing(3),
            position: 'relative',
            zIndex: 1
          },
          '.MuiBox-root.crm-app-shell__canvas': {
            position: 'relative',
            width: '100%',
            paddingTop: theme.spacing(1.1),
            paddingBottom: theme.spacing(1),
            [theme.breakpoints.up('md')]: {
              paddingTop: theme.spacing(1.5),
              paddingBottom: theme.spacing(1.5)
            }
          },
          '.MuiBox-root.crm-app-shell__content': {
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(Math.max(pageGap - 1.8, 1.15)),
            paddingTop: 0,
            paddingBottom: 0
          },
          '.MuiToolbar-root.crm-app-shell__offset': {
            minHeight: layoutTokens.headerHeight.xs + 2,
            [theme.breakpoints.up('md')]: {
              minHeight: layoutTokens.headerHeight.md + 4
            }
          },

          '.MuiAppBar-root.crm-app-bar': {
            zIndex: theme.zIndex.drawer + 1,
            top: 6,
            right: 6,
            left: 'auto',
            border: `1px solid ${headerBorder}`,
            backdropFilter: `blur(${blur.md || 14}px) saturate(${surface.saturate || 140}%)`,
            WebkitBackdropFilter: `blur(${blur.md || 14}px) saturate(${surface.saturate || 140}%)`,
            backgroundColor: headerSurface,
            borderRadius: 14,
            boxShadow: shadow.sm || `0 10px 24px ${alpha(theme.palette.text.primary, isLight ? 0.05 : 0.18)}`,
            transition: theme.transitions.create(['width', 'margin-left'], {
              duration: motionTokens.standardDurationMs,
              easing: motionTokens.standardEasing
            })
          },
          '.MuiAppBar-root.crm-app-bar--expanded': {
            width: `calc(100% - ${layoutTokens.drawerExpanded + 12}px)`,
            marginLeft: layoutTokens.drawerExpanded + 6
          },
          '.MuiAppBar-root.crm-app-bar--collapsed': {
            width: `calc(100% - ${layoutTokens.drawerCollapsed + 12}px)`,
            marginLeft: layoutTokens.drawerCollapsed + 6
          },
          '.MuiAppBar-root.crm-app-bar--mobile': {
            width: 'calc(100% - 12px)',
            marginLeft: 6
          },
          '.MuiToolbar-root.crm-app-bar__toolbar': {
            minHeight: 52,
            gap: theme.spacing(0.7),
            paddingLeft: theme.spacing(0.75),
            paddingRight: theme.spacing(0.75),
            [theme.breakpoints.up('md')]: {
              minHeight: 56,
              paddingLeft: theme.spacing(1.1),
              paddingRight: theme.spacing(1.1)
            }
          },
          '.MuiContainer-root.crm-app-bar__inner': {
            width: '100%',
            maxWidth: `${contentMaxWidth}px !important`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: theme.spacing(0.9)
          },
          '.MuiStack-root.crm-app-bar__left': {
            flex: 1,
            minWidth: 0,
            maxWidth: '100%',
            gap: 0
          },
          '.MuiBox-root.crm-app-bar__brand': {
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            '& .crm-brand__copy': {
              [theme.breakpoints.down('sm')]: {
                display: 'none'
              }
            }
          },
          '.MuiStack-root.crm-app-bar__context': {
            display: 'none',
            minWidth: 0,
            padding: theme.spacing(0.5, 0.85),
            borderRadius: 16,
            border: `1px solid ${border.soft || alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14)}`,
            backgroundColor: surface.floating || alpha(theme.palette.background.paper, isLight ? 0.9 : 0.82),
            boxShadow: shadow.xs || `0 8px 16px ${alpha(theme.palette.text.primary, isLight ? 0.05 : 0.14)}`,
            [theme.breakpoints.up('lg')]: {
              display: 'grid'
            }
          },
          '.MuiTypography-root.crm-app-bar__context-eyebrow': {
            fontSize: '0.68rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: alpha(theme.palette.text.secondary, 0.9)
          },
          '.MuiTypography-root.crm-app-bar__context-title': {
            fontWeight: 650,
            letterSpacing: '-0.012em',
            color: theme.palette.text.primary,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          },
          '.MuiTypography-root.crm-app-bar__context-subtitle': {
            color: alpha(theme.palette.text.secondary, 0.86),
            lineHeight: 1.35,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            [theme.breakpoints.down('xl')]: {
              display: 'none'
            }
          },
          '.MuiIconButton-root.crm-app-bar__menu-trigger': {
            flexShrink: 0,
            border: `1px solid ${border.soft || alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14)}`,
            color: theme.palette.text.primary,
            backgroundColor: surface.floating || alpha(theme.palette.background.paper, isLight ? 0.92 : 0.82),
            boxShadow: shadow.xs || `0 8px 16px ${alpha(theme.palette.text.primary, isLight ? 0.05 : 0.14)}`,
            '&:hover': {
              borderColor: border.accent || alpha(theme.palette.primary.main, isLight ? 0.24 : 0.34),
              backgroundColor: state.hover || alpha(theme.palette.primary.main, isLight ? 0.08 : 0.16)
            }
          },
          '.MuiBox-root.crm-app-bar__search': {
            flexGrow: 1,
            minWidth: 0,
            width: '100%',
            maxWidth: '100%'
          },
          '.MuiBox-root.crm-app-bar__search .MuiPaper-root.crm-global-search__input-shell': {
            minHeight: 46,
            borderRadius: 16,
            backgroundColor: surface.floating || alpha(theme.palette.background.paper, isLight ? 0.95 : 0.84),
            borderColor: border.soft || alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14),
            boxShadow: shadow.xs || `0 8px 16px ${alpha(theme.palette.text.primary, isLight ? 0.05 : 0.14)}`
          },
          '.MuiStack-root.crm-app-bar__user-area': {
            marginLeft: 'auto',
            gap: theme.spacing(0.6),
            flexShrink: 0,
            minWidth: 0,
            [theme.breakpoints.down('sm')]: {
              gap: theme.spacing(0.35)
            }
          },
          '.MuiButton-root.crm-app-bar__quick-trigger': {
            minHeight: 38,
            padding: theme.spacing(0.6, 1.5),
            borderRadius: 12,
            textTransform: 'none',
            whiteSpace: 'nowrap',
            color: theme.palette.text.primary,
            border: `1px solid ${alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14)}`,
            backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.92 : 0.78),
            boxShadow: `0 8px 18px ${alpha(theme.palette.text.primary, isLight ? 0.05 : 0.16)}`,
            '&:hover': {
              borderColor: alpha(theme.palette.primary.main, isLight ? 0.24 : 0.34),
              backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.08 : 0.16)
            },
            [theme.breakpoints.down('sm')]: {
              minWidth: 38,
              padding: theme.spacing(0.4, 0.65),
              '& .MuiButton-startIcon': {
                margin: 0
              },
              fontSize: 0
            }
          },
          '.MuiIconButton-root.crm-app-bar__notification': {
            border: `1px solid ${alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14)}`,
            color: theme.palette.text.primary,
            backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.88 : 0.76),
            boxShadow: `0 8px 16px ${alpha(theme.palette.text.primary, isLight ? 0.05 : 0.14)}`,
            '&:hover': {
              borderColor: alpha(theme.palette.primary.main, isLight ? 0.24 : 0.34),
              backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.08 : 0.16)
            }
          },
          '.MuiBadge-root.crm-app-bar__notification-badge .MuiBadge-badge': {
            minWidth: 18,
            height: 18,
            padding: theme.spacing(0, 0.6),
            fontSize: '0.65rem',
            fontWeight: 700,
            borderRadius: 999,
            border: `1px solid ${alpha(theme.palette.background.paper, isLight ? 0.92 : 0.74)}`,
            boxShadow: `0 6px 12px ${alpha(theme.palette.primary.main, isLight ? 0.14 : 0.22)}`
          },
          '.MuiBox-root.crm-app-bar__user-info': {
            display: 'none',
            [theme.breakpoints.up('sm')]: {
              display: 'block'
            }
          },
          '.MuiButton-root.crm-app-bar__user-trigger': {
            padding: theme.spacing(0.3, 0.75),
            borderRadius: 15,
            textTransform: 'none',
            color: theme.palette.text.primary,
            backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.82 : 0.72),
            border: `1px solid ${alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14)}`,
            boxShadow: `0 8px 16px ${alpha(theme.palette.text.primary, isLight ? 0.05 : 0.14)}`,
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.07 : 0.15)
            },
            [theme.breakpoints.down('sm')]: {
              minWidth: 0,
              padding: theme.spacing(0.24, 0.4),
              '& .MuiButton-endIcon': {
                display: 'none'
              }
            }
          },
          '.MuiButton-root.crm-app-bar__user-trigger .MuiButton-endIcon': {
            marginLeft: theme.spacing(0.5)
          },
          '.MuiIconButton-root.crm-app-bar__theme-toggle': {
            border: `1px solid ${alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14)}`,
            color: theme.palette.text.primary,
            backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.88 : 0.76),
            boxShadow: `0 8px 16px ${alpha(theme.palette.text.primary, isLight ? 0.05 : 0.14)}`,
            '&:hover': {
              borderColor: alpha(theme.palette.primary.main, isLight ? 0.24 : 0.34),
              backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.08 : 0.16)
            }
          },
          '.MuiMenu-paper.crm-app-bar__menu': {
            ...buildGlassSurface(theme, {
              radius: 16,
              borderAlpha: isLight ? 0.08 : 0.14,
              backgroundAlpha: isLight ? 0.97 : 0.93,
              blur: 10,
              shadowAlpha: isLight ? 0.08 : 0.18
            }),
            minWidth: 220,
            maxWidth: 'calc(100vw - 24px)'
          },
          '.MuiMenu-paper.crm-app-bar__quick-menu': {
            minWidth: 296,
            width: 'min(296px, calc(100vw - 24px))'
          },
          '.MuiMenu-paper.crm-app-bar__notification-menu': {
            minWidth: 320,
            maxWidth: 360,
            width: 'min(360px, calc(100vw - 24px))'
          },
          '.MuiMenuItem-root.crm-app-bar__menu-item': {
            minHeight: 44,
            paddingTop: theme.spacing(1),
            paddingBottom: theme.spacing(1),
            fontSize: theme.typography.body2.fontSize
          },
          '.MuiMenu-paper.crm-app-bar__quick-menu .MuiMenuItem-root.crm-app-bar__menu-item, .MuiMenu-paper.crm-app-bar__notification-menu .MuiMenuItem-root.crm-app-bar__menu-item': {
            alignItems: 'flex-start'
          },
          '.MuiMenu-paper.crm-app-bar__quick-menu .MuiTypography-root.MuiListItemText-secondary, .MuiMenu-paper.crm-app-bar__notification-menu .MuiTypography-root.MuiListItemText-secondary': {
            marginTop: theme.spacing(0.25),
            color: alpha(theme.palette.text.secondary, 0.9)
          },
          '.MuiMenuItem-root.crm-app-bar__menu-item .MuiListItemIcon-root': {
            minWidth: 32,
            marginTop: theme.spacing(0.25),
            color: theme.palette.text.secondary
          },
          '.MuiDrawer-root.crm-app-drawer': {
            flexShrink: 0,
            transition: theme.transitions.create('width', {
              duration: motionTokens.standardDurationMs,
              easing: motionTokens.standardEasing
            })
          },
          '.MuiDrawer-root.crm-app-drawer--expanded': {
            width: layoutTokens.drawerExpanded
          },
          '.MuiDrawer-root.crm-app-drawer--collapsed': {
            width: layoutTokens.drawerCollapsed
          },
          '.MuiDrawer-root.crm-app-drawer--mobile': {
            width: layoutTokens.drawerExpanded
          },
          '.MuiDrawer-paper.crm-app-drawer__paper': {
            boxSizing: 'border-box',
            position: 'relative',
            top: 12,
            left: 12,
            height: 'calc(100% - 24px)',
            border: `1px solid ${sidebarSurfaceBorder}`,
            backgroundImage: gradients.sidebarBackground,
            backgroundColor: surface.sidebar || alpha(theme.palette.background.default, isLight ? 0.98 : 0.96),
            backdropFilter: `blur(${blur.md || 14}px) saturate(${surface.saturate || 140}%)`,
            WebkitBackdropFilter: `blur(${blur.md || 14}px) saturate(${surface.saturate || 140}%)`,
            color: sidebarTextPrimary,
            overflow: 'hidden',
            borderRadius: component.sidebar?.radius || 24,
            boxShadow: shadow.xl || `0 18px 34px ${alpha(theme.palette.text.primary, isLight ? 0.06 : 0.18)}`,
            transition: theme.transitions.create(['width', 'background-color', 'border-color', 'box-shadow'], {
              duration: motionTokens.standardDurationMs,
              easing: motionTokens.standardEasing
            }),
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, isLight ? 0.2 : 0.05)} 0%, transparent 28%)`,
              opacity: 1
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: `radial-gradient(circle at 100% 0%, ${alpha(theme.palette.primary.main, isLight ? 0.05 : 0.08)} 0%, transparent 34%)`
            }
          },
          '.MuiDrawer-paper.crm-app-drawer__paper--expanded': {
            width: `calc(${layoutTokens.drawerExpanded}px - 24px)`
          },
          '.MuiDrawer-paper.crm-app-drawer__paper--collapsed': {
            width: `calc(${layoutTokens.drawerCollapsed}px - 24px)`
          },
          '.MuiDrawer-paper.crm-app-drawer__paper--mobile': {
            width: `min(calc(100vw - 24px), ${layoutTokens.drawerExpanded}px)`
          },

          '.MuiBox-root.crm-app-shell__drawer-content': {
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            color: sidebarTextPrimary,
            position: 'relative',
            zIndex: 1
          },
          '.MuiBox-root.crm-app-shell__drawer-header': {
            padding: theme.spacing(1.8, 1.55, 1.4),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: theme.transitions.create(['padding'], {
              duration: motionTokens.standardDurationMs,
              easing: motionTokens.standardEasing
            })
          },
          '.MuiStack-root.crm-app-shell__drawer-header-copy': {
            minWidth: 0,
            gap: theme.spacing(0.5)
          },
          '.MuiTypography-root.crm-app-shell__drawer-kicker': {
            fontWeight: 650,
            fontSize: '0.68rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: alpha(sidebarTextSecondary, 0.92)
          },
          '.MuiBox-root.crm-app-shell__drawer-header--collapsed': {
            padding: theme.spacing(1.45, 0.85),
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing(0.9)
          },
          '.MuiBox-root.crm-app-shell__drawer-header--collapsed .MuiStack-root.crm-app-shell__drawer-header-copy': {
            alignItems: 'center',
            textAlign: 'center'
          },
          '.MuiBox-root.crm-app-shell__drawer-header--collapsed .MuiIconButton-root': {
            marginTop: theme.spacing(0.15)
          },
          '.MuiDivider-root.crm-app-shell__drawer-divider': {
            margin: theme.spacing(0, 1.05),
            borderColor: sidebarDivider,
            opacity: 0.92
          },
          '.MuiBox-root.crm-app-shell__drawer-content .MuiTypography-root.crm-brand__text': {
            color: sidebarTextPrimary
          },
          '.MuiBox-root.crm-app-shell__drawer-content .MuiTypography-root.crm-brand__tagline': {
            color: sidebarTextSecondary
          },
          '.MuiBox-root.crm-app-shell__drawer-header .MuiIconButton-root': {
            color: sidebarTextSecondary,
            borderColor: alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14),
            backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.92 : 0.82),
            '&:hover': {
              backgroundColor: alpha(sidebarActiveIndicator, isLight ? 0.08 : 0.16),
              color: sidebarTextPrimary
            }
          },

          '.MuiList-root.crm-app-shell__nav-list': {
            padding: theme.spacing(1.3, 1.05, 1.65),
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(0.35),
            overflowY: 'auto',
            overflowX: 'hidden'
          },
          '.MuiList-root.crm-app-shell__nav-list--collapsed': {
            paddingLeft: theme.spacing(0.7),
            paddingRight: theme.spacing(0.7)
          },
          '.MuiListSubheader-root.crm-app-shell__section-title': {
            padding: theme.spacing(0.95, 1.05, 0.5),
            margin: 0,
            lineHeight: 1.2,
            fontSize: '0.68rem',
            fontWeight: 700,
            letterSpacing: '0.11em',
            textTransform: 'uppercase',
            color: alpha(sidebarTextSecondary, 0.92),
            backgroundColor: 'transparent'
          },
          '.MuiDivider-root.crm-app-shell__section-divider': {
            margin: theme.spacing(0.9, 0.95),
            borderColor: sidebarDivider,
            opacity: 0.88
          },

          '.MuiListItemButton-root.crm-app-shell__nav-item': {
            marginBottom: theme.spacing(0.25),
            padding: theme.spacing(0.72, 1.02),
            borderRadius: component.sidebar?.itemRadius || 16,
            justifyContent: 'flex-start',
            minHeight: 46,
            color: sidebarTextPrimary,
            position: 'relative',
            overflow: 'hidden',
            isolation: 'isolate',
            border: `1px solid ${alpha(theme.palette.text.primary, isLight ? 0.02 : 0.05)}`,
            transition: theme.transitions.create(
              ['background-color', 'color', 'transform', 'box-shadow', 'border-color'],
              { duration: microMotionMs }
            ),
            '&::before': {
              content: '""',
              position: 'absolute',
              left: theme.spacing(0.45),
              top: theme.spacing(0.58),
              bottom: theme.spacing(0.58),
              width: 2,
              borderRadius: 999,
              backgroundColor: 'transparent',
              boxShadow: 'none',
              transition: `background-color ${microMotion}, box-shadow ${microMotion}`
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              opacity: 0,
              background: `linear-gradient(90deg, ${alpha(theme.palette.common.white, isLight ? 0.4 : 0.06)} 0%, transparent 42%)`,
              transition: `opacity ${microMotion}`
            },
            '&:hover': {
              backgroundColor: sidebarHoverBackground,
              borderColor: alpha(sidebarActiveIndicator, isLight ? 0.16 : 0.26),
              color: sidebarTextPrimary,
              transform: 'translateY(-1px)',
              boxShadow: shadow.xs || `0 10px 18px ${alpha(theme.palette.text.primary, isLight ? 0.05 : 0.14)}`,
              '&::after': {
                opacity: 0.9
              }
            },
            '&.Mui-selected': {
              backgroundColor: sidebarActiveBackground,
              borderColor: alpha(sidebarActiveIndicator, isLight ? 0.22 : 0.34),
              color: sidebarTextPrimary,
              transform: 'translateY(-1px)',
              boxShadow: shadow.glow || `0 12px 20px ${alpha(sidebarActiveIndicator, isLight ? 0.12 : 0.18)}`,
              '&::before': {
                backgroundColor: sidebarActiveIndicator,
                boxShadow: 'none'
              },
              '&::after': {
                opacity: 0.88
              }
            },
            '&.Mui-selected:hover': {
              backgroundColor: alpha(sidebarActiveIndicator, isLight ? 0.14 : 0.24)
            },
            '& .MuiListItemText-primary': {
              color: sidebarTextPrimary
            },
            '& .MuiListItemText-secondary': {
              color: sidebarTextSecondary
            },
            '&.Mui-disabled': {
              color: alpha(sidebarTextSecondary, 0.74),
              opacity: 0.72
            }
          },
          '.MuiListItemButton-root.crm-app-shell__nav-item--collapsed': {
            justifyContent: 'center',
            paddingLeft: theme.spacing(0.72),
            paddingRight: theme.spacing(0.72),
            '&:hover': {
              transform: 'translateY(-1px)'
            },
            '&.Mui-selected': {
              transform: 'translateY(-1px)'
            }
          },
          '.MuiListItemIcon-root.crm-app-shell__nav-icon': {
            minWidth: 0,
            marginRight: theme.spacing(1),
            color: sidebarIconColor,
            transition: `color ${microMotion}, transform ${microMotion}, margin ${microMotion}`,
            '& .MuiSvgIcon-root, & .crm-icon': {
              width: 17,
              height: 17,
              fontSize: '1.06rem'
            }
          },
          '.MuiListItemIcon-root.crm-app-shell__nav-icon--collapsed': {
            marginRight: 0
          },
          '.MuiBox-root.crm-app-shell__nav-icon-shell': {
            width: 32,
            height: 32,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.94 : 0.84),
            border: `1px solid ${alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14)}`,
            boxShadow: `0 6px 12px ${alpha(theme.palette.text.primary, isLight ? 0.04 : 0.12)}`,
            transition: theme.transitions.create(
              ['background-color', 'border-color', 'box-shadow', 'transform'],
              { duration: microMotionMs }
            )
          },
          '.MuiListItemButton-root.crm-app-shell__nav-item:hover .MuiListItemIcon-root.crm-app-shell__nav-icon': {
            color: sidebarTextPrimary,
            transform: 'translateX(1px)'
          },
          '.MuiListItemButton-root.crm-app-shell__nav-item:hover .MuiBox-root.crm-app-shell__nav-icon-shell': {
            backgroundColor: alpha(sidebarActiveIndicator, isLight ? 0.1 : 0.18),
            borderColor: alpha(sidebarActiveIndicator, isLight ? 0.18 : 0.3),
            boxShadow: `0 8px 14px ${alpha(sidebarActiveIndicator, isLight ? 0.08 : 0.16)}`
          },
          '.MuiListItemButton-root.crm-app-shell__nav-item.Mui-selected .MuiListItemIcon-root.crm-app-shell__nav-icon': {
            color: theme.palette.primary.contrastText
          },
          '.MuiListItemButton-root.crm-app-shell__nav-item.Mui-selected .MuiBox-root.crm-app-shell__nav-icon-shell': {
            backgroundColor: sidebarActiveIndicator,
            borderColor: alpha(sidebarActiveIndicator, isLight ? 0.28 : 0.42),
            boxShadow: `0 10px 16px ${alpha(sidebarActiveIndicator, isLight ? 0.14 : 0.2)}`
          },
          '.MuiListItemText-root.crm-app-shell__nav-copy': {
            margin: 0,
            minWidth: 0,
            flex: '1 1 auto',
            maxWidth: 174,
            opacity: 1,
            transform: 'translateX(0)',
            transition: theme.transitions.create(['max-width', 'opacity', 'transform'], {
              duration: motionTokens.standardDurationMs,
              easing: motionTokens.standardEasing
            }),
            '& .MuiListItemText-primary': {
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            },
            '& .MuiListItemText-secondary': {
              marginTop: theme.spacing(0.12),
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }
          },
          '.MuiListItemText-root.crm-app-shell__nav-copy--collapsed': {
            flex: '0 0 0px',
            maxWidth: 0,
            opacity: 0,
            transform: 'translateX(-10px)',
            pointerEvents: 'none'
          },
          '.MuiTypography-root.crm-nav-item__secondary': {
            fontSize: labelTypography.subdued.fontSize,
            fontWeight: labelTypography.subdued.fontWeight,
            lineHeight: labelTypography.subdued.lineHeight,
            letterSpacing: labelTypography.subdued.letterSpacing,
            color: sidebarTextSecondary
          },

          '.MuiAvatar-root.crm-avatar--sm': {
            width: 30,
            height: 30
          },
          '.MuiAvatar-root.crm-avatar--md': {
            width: 35,
            height: 35
          },

          '.MuiBox-root.crm-page': {
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(pageGap),
            width: '100%',
            animation: `crm-fade-in ${microMotion}`
          },
          '.MuiBox-root.crm-page__content': {
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(Math.max(pageGap - 2.1, 1.05)),
            width: '100%'
          },
          '.MuiBox-root.crm-page__section': {
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(Math.max(sectionGap - 1, 1.25))
          },
          '.MuiBox-root.crm-page__section--dense': {
            gap: theme.spacing(Math.max(sectionDenseGap - 0.65, 1))
          },
          '.MuiStack-root.crm-page__header': {
            width: '100%',
            gap: theme.spacing(0.35),
            position: 'relative',
            paddingBottom: 0,
            marginBottom: 0,
            borderBottom: 0
          },
          '.MuiStack-root.crm-page__header--center': {
            alignItems: 'center',
            textAlign: 'center',
            justifyContent: 'center'
          },
          '.MuiStack-root.crm-page__header-meta': {
            gap: theme.spacing(0.5),
            minWidth: 0
          },
          '.MuiStack-root.crm-page__header-main': {
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(0.45),
            minWidth: 0
          },
          '.MuiStack-root.crm-page__header--center .MuiBox-root.crm-page__breadcrumbs-shell': {
            alignSelf: 'center'
          },
          '.MuiStack-root.crm-page__header--center .MuiStack-root.crm-page__header-main': {
            alignItems: 'center'
          },
          '.MuiStack-root.crm-page__header--center .MuiStack-root.crm-page__header-actions': {
            justifyContent: 'center'
          },
          '.MuiStack-root.crm-page__header-copy': {
            gap: theme.spacing(0.22),
            maxWidth: 680,
            minWidth: 0
          },
          '.MuiStack-root.crm-page__header-actions': {
            gap: theme.spacing(0.65),
            flexWrap: 'wrap',
            alignSelf: 'flex-start',
            justifyContent: 'flex-start',
            minWidth: 0,
            '& > *': {
              maxWidth: '100%'
            }
          },
          '.MuiBox-root.crm-page__breadcrumbs-shell': {
            display: 'inline-flex',
            alignItems: 'center',
            alignSelf: 'flex-start',
            padding: 0,
            borderRadius: 0,
            border: 0,
            backgroundColor: 'transparent',
            boxShadow: 'none',
            maxWidth: '100%'
          },
          '.MuiTypography-root.crm-page__eyebrow': {
            fontWeight: labelTypography.default.fontWeight,
            fontSize: '0.68rem',
            lineHeight: 1.25,
            textTransform: labelTypography.default.textTransform,
            letterSpacing: '0.08em',
            color: alpha(theme.palette.text.secondary, 0.82)
          },
          '.MuiBreadcrumbs-root.crm-page__breadcrumbs': {
            fontSize: '0.72rem',
            color: theme.palette.text.secondary,
            maxWidth: '100%',
            overflow: 'hidden',
            lineHeight: 1.2,
            '& .MuiBreadcrumbs-separator': {
              marginLeft: theme.spacing(0.35),
              marginRight: theme.spacing(0.35),
              color: alpha(theme.palette.text.secondary, 0.42)
            }
          },
          '.MuiLink-root.crm-page__breadcrumb-link': {
            fontWeight: 600,
            color: theme.palette.text.secondary,
            transition: `color ${microMotion}`,
            '&:hover': {
              color: theme.palette.text.primary
            }
          },
          '.MuiTypography-root.crm-page__breadcrumb-current': {
            fontWeight: 600,
            color: alpha(theme.palette.text.secondary, 0.9)
          },
          '.MuiBox-root.crm-page-grid': {
            display: 'grid',
            gap: theme.spacing(pageGridGap),
            gridTemplateColumns: `repeat(${pageGridColumns.xs}, minmax(0, 1fr))`,
            [theme.breakpoints.up('sm')]: {
              gridTemplateColumns: `repeat(${pageGridColumns.sm}, minmax(0, 1fr))`
            },
            [theme.breakpoints.up('lg')]: {
              gridTemplateColumns: `repeat(${pageGridColumns.lg}, minmax(0, 1fr))`
            },
            alignItems: 'stretch'
          },
          '.MuiBox-root.crm-page__footer': {
            marginTop: theme.spacing(pageFooterMarginTop)
          },

          '.MuiPaper-root.crm-surface-card': {
            ...getCardSurface(theme, { soft: true }),
            padding: theme.spacing(2.1)
          },
          '.MuiPaper-root.crm-surface-card--compact': {
            padding: theme.spacing(1.55)
          },
          '.MuiPaper-root.crm-surface-card--nested, .MuiPaper-root.crm-surface-card__list-item, .MuiBox-root.crm-surface-card__selection-item': {
            ...getInsetSurface(theme),
            padding: theme.spacing(1.05, 1.15)
          },
          '.MuiStack-root.crm-surface-card__header': {
            position: 'relative',
            zIndex: 1,
            gap: theme.spacing(0.7),
            paddingBottom: theme.spacing(1.05),
            marginBottom: theme.spacing(1.1),
            borderBottom: `1px solid ${border.soft || alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14)}`
          },
          '.MuiStack-root.crm-surface-card__header--split': {
            [theme.breakpoints.up('sm')]: {
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between'
            }
          },
          '.MuiStack-root.crm-surface-card__header-main': {
            gap: theme.spacing(0.35),
            minWidth: 0,
            flex: '1 1 auto'
          },
          '.MuiStack-root.crm-surface-card__actions': {
            flexShrink: 0,
            gap: theme.spacing(0.8),
            flexWrap: 'wrap',
            alignItems: 'center'
          },
          '.MuiTypography-root.crm-surface-card__eyebrow': {
            fontWeight: labelTypography.default.fontWeight,
            fontSize: labelTypography.default.fontSize,
            lineHeight: labelTypography.default.lineHeight,
            letterSpacing: labelTypography.default.letterSpacing,
            textTransform: labelTypography.default.textTransform,
            color: alpha(theme.palette.text.secondary, 0.92)
          },
          '.MuiTypography-root.crm-surface-card__title': {
            fontWeight: 650,
            fontSize: theme.typography.h6.fontSize,
            lineHeight: 1.28,
            letterSpacing: '-0.012em',
            color: theme.palette.text.primary
          },
          '.MuiTypography-root.crm-surface-card__subtitle': {
            fontWeight: sectionTypography.subtitle.fontWeight,
            fontSize: sectionTypography.subtitle.fontSize,
            lineHeight: sectionTypography.subtitle.lineHeight,
            letterSpacing: sectionTypography.subtitle.letterSpacing,
            color: theme.palette.text.secondary,
            maxWidth: 760
          },
          '.MuiBox-root.crm-surface-card__meta-grid, .MuiBox-root.crm-surface-card__stat-grid': {
            display: 'grid',
            gap: theme.spacing(1.15),
            gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
            [theme.breakpoints.up('sm')]: {
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
            },
            [theme.breakpoints.up('lg')]: {
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))'
            }
          },
          '.MuiBox-root.crm-surface-card__meta-grid--wide': {
            [theme.breakpoints.up('xl')]: {
              gridTemplateColumns: 'repeat(5, minmax(0, 1fr))'
            }
          },
          '.MuiBox-root.crm-surface-card__meta-item, .MuiBox-root.crm-surface-card__stat': {
            ...getInsetSurface(theme),
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(0.45),
            minWidth: 0
          },
          '.MuiBox-root.crm-surface-card__stat': {
            ...getCompactMetricSurface(theme)
          },
          '.MuiTypography-root.crm-surface-card__meta-label, .MuiTypography-root.crm-surface-card__stat-label': {
            fontWeight: labelTypography.subdued.fontWeight,
            fontSize: labelTypography.subdued.fontSize,
            lineHeight: labelTypography.subdued.lineHeight,
            letterSpacing: labelTypography.subdued.letterSpacing,
            color: alpha(theme.palette.text.secondary, 0.9)
          },
          '.MuiTypography-root.crm-surface-card__meta-value': {
            fontWeight: 600,
            lineHeight: 1.38,
            color: theme.palette.text.primary
          },
          '.MuiTypography-root.crm-surface-card__stat-value': {
            fontWeight: metricTypography.value.fontWeight,
            fontSize: '1.48rem',
            lineHeight: 1.08,
            letterSpacing: '-0.024em',
            color: theme.palette.text.primary
          },
          '.MuiTypography-root.crm-surface-card__stat-support': {
            color: theme.palette.text.secondary
          },
          '.MuiStack-root.crm-surface-card__badge-row': {
            position: 'relative',
            zIndex: 1,
            gap: theme.spacing(0.75),
            flexWrap: 'wrap',
            alignItems: 'center'
          },
          '.MuiStack-root.crm-surface-card__list': {
            position: 'relative',
            zIndex: 1,
            gap: theme.spacing(1.1)
          },
          '.MuiStack-root.crm-surface-card__list-copy': {
            minWidth: 0,
            width: '100%',
            gap: theme.spacing(0.3)
          },
          '.MuiStack-root.crm-surface-card__action-row': {
            position: 'relative',
            zIndex: 1,
            gap: theme.spacing(1),
            justifyContent: 'flex-end',
            flexWrap: 'wrap'
          },
          '.MuiBox-root.crm-surface-card__selection-item': {
            transition: theme.transitions.create(
              ['border-color', 'background-color', 'box-shadow', 'transform'],
              { duration: microMotionMs }
            )
          },
          '.MuiBox-root.crm-surface-card__selection-item--checked': {
            borderColor: alpha(theme.palette.primary.main, isLight ? 0.24 : 0.36),
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.08 : 0.14),
            boxShadow: `0 10px 20px ${alpha(theme.palette.primary.main, isLight ? 0.08 : 0.14)}`
          },

          '.MuiDialog-root.crm-dialog .MuiPaper-root': {
            borderRadius: 24,
            animation: 'crm-modal-enter 300ms ease-out',
            transformOrigin: 'center'
          },
          '.MuiDialogTitle-root.crm-dialog__title': {
            padding: theme.spacing(1.75, 2.4, 1),
            borderBottom: `1px solid ${alpha(theme.palette.divider, isLight ? 0.82 : 0.68)}`
          },
          '.MuiStack-root.crm-dialog__title-stack': {
            gap: theme.spacing(0.45)
          },
          '.MuiTypography-root.crm-dialog__title-text': {
            fontWeight: 660,
            letterSpacing: '-0.016em',
            color: theme.palette.text.primary
          },
          '.MuiTypography-root.crm-dialog__subtitle-text': {
            color: alpha(theme.palette.text.secondary, 0.92),
            maxWidth: 680
          },
          '.MuiDialogContent-root.crm-dialog__content': {
            padding: theme.spacing(1.75, 2.4),
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(1.35),
            '& .MuiTextField-root, & .MuiAutocomplete-root, & .MuiFormControl-root': {
              width: '100%'
            },
            '& .MuiFormControlLabel-root': {
              margin: 0
            },
            '& .MuiAlert-root': {
              alignSelf: 'stretch'
            }
          },
          '.MuiDialogActions-root.crm-dialog__actions': {
            padding: theme.spacing(1.05, 2.4, 1.55),
            justifyContent: 'flex-end',
            gap: theme.spacing(0.85),
            borderTop: `1px solid ${alpha(theme.palette.divider, isLight ? 0.8 : 0.64)}`,
            '& > .MuiStack-root': {
              width: '100%',
              alignItems: 'center',
              justifyContent: 'flex-end',
              flexWrap: 'wrap',
              gap: theme.spacing(0.8)
            }
          },
          '.MuiStack-root.crm-dashboard': {
            gap: theme.spacing(2.2)
          },
          '.MuiPaper-root.crm-dashboard__hero': {
            ...getDashboardGlass(theme),
            padding: theme.spacing(2.5),
            position: 'relative',
            overflow: 'hidden',
            backgroundImage: gradients.dashboardHero,
            animation: `crm-fade-in ${microMotion}`,
            ...getHoverLift(theme),
            border: `1px solid ${alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14)}`,
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, isLight ? 0.18 : 0.04)} 0%, transparent 36%)`
            }
          },
          '.MuiBox-root.crm-dashboard__hero-grid': {
            position: 'relative',
            zIndex: 1,
            display: 'grid',
            gap: theme.spacing(1.75),
            gridTemplateColumns: 'minmax(0, 1fr)',
            [theme.breakpoints.up('md')]: {
              gridTemplateColumns: 'minmax(0, 1.18fr) minmax(320px, 0.82fr)',
              alignItems: 'stretch'
            },
            [theme.breakpoints.up('lg')]: {
              gridTemplateColumns: 'minmax(0, 1.24fr) minmax(340px, 0.84fr)'
            }
          },
          '.MuiStack-root.crm-dashboard__hero-copy': {
            maxWidth: 760,
            gap: theme.spacing(0.85),
            justifyContent: 'center'
          },
          '.MuiTypography-root.crm-dashboard__hero-eyebrow': {
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: alpha(theme.palette.primary.main, 0.84)
          },
          '.MuiTypography-root.crm-dashboard__hero-title': {
            fontWeight: 670,
            letterSpacing: '-0.03em'
          },
          '.MuiTypography-root.crm-dashboard__hero-copy-text': {
            maxWidth: 700
          },
          '.MuiStack-root.crm-dashboard__hero-tags': {
            position: 'relative',
            zIndex: 1,
            alignItems: 'center'
          },
          '.MuiBox-root.crm-dashboard__hero-highlight-grid': {
            position: 'relative',
            zIndex: 1,
            display: 'grid',
            gap: theme.spacing(1.1),
            gridTemplateColumns: 'minmax(0, 1fr)',
            marginTop: theme.spacing(0.4),
            [theme.breakpoints.up('sm')]: {
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
            }
          },
          '.MuiBox-root.crm-dashboard__hero-highlight': {
            ...getCompactMetricSurface(theme),
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: theme.spacing(0.5),
            position: 'relative',
            zIndex: 1,
            minWidth: 0
          },
          '.MuiTypography-root.crm-dashboard__hero-highlight-label': {
            color: alpha(theme.palette.text.secondary, 0.92),
            letterSpacing: '0.04em',
            textTransform: 'uppercase'
          },
          '.MuiTypography-root.crm-dashboard__hero-highlight-value': {
            letterSpacing: '-0.026em'
          },
          '.MuiTypography-root.crm-dashboard__hero-highlight-support': {
            color: alpha(theme.palette.text.secondary, 0.9),
            lineHeight: 1.5
          },
          '.MuiStack-root.crm-dashboard__hero-side': {
            height: '100%',
            gap: theme.spacing(1)
          },
          '.MuiPaper-root.crm-dashboard__control-card, .MuiPaper-root.crm-dashboard__actions-card': {
            ...getInsetSurface(theme, {
              radius: 18,
              backgroundAlpha: isLight ? 0.84 : 0.64,
              borderAlpha: isLight ? 0.08 : 0.14,
              shadowAlpha: isLight ? 0.06 : 0.14
            }),
            padding: theme.spacing(1.65),
            position: 'relative',
            zIndex: 1,
            overflow: 'hidden'
          },
          '.MuiPaper-root.crm-dashboard__control-card': {
            flex: 1,
            minHeight: 0
          },
          '.MuiStack-root.crm-dashboard__control-main': {
            position: 'relative',
            zIndex: 1,
            paddingBottom: theme.spacing(0.4),
            borderBottom: `1px solid ${border.soft || alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14)}`
          },
          '.MuiTypography-root.crm-dashboard__control-label': {
            color: alpha(theme.palette.text.secondary, 0.92),
            letterSpacing: '0.06em',
            textTransform: 'uppercase'
          },
          '.MuiTypography-root.crm-dashboard__control-value': {
            letterSpacing: '-0.04em'
          },
          '.MuiTypography-root.crm-dashboard__control-support': {
            color: theme.palette.text.secondary,
            maxWidth: '30rem'
          },
          '.MuiStack-root.crm-dashboard__control-list': {
            position: 'relative',
            zIndex: 1,
            gap: theme.spacing(0.7)
          },
          '.MuiBox-root.crm-dashboard__control-item': {
            ...getInsetSurface(theme, {
              radius: 14,
              backgroundAlpha: isLight ? 0.78 : 0.56,
              borderAlpha: isLight ? 0.08 : 0.14,
              shadowAlpha: isLight ? 0.05 : 0.1
            }),
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: theme.spacing(1),
            padding: theme.spacing(0.95, 1.05),
            minWidth: 0
          },
          '.MuiBox-root.crm-dashboard__control-item--positive': {
            borderColor: alpha(theme.palette.success.main, isLight ? 0.2 : 0.28),
            backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.success.main, isLight ? 0.06 : 0.12)} 0%, ${alpha(theme.palette.background.paper, isLight ? 0.86 : 0.62)} 100%)`
          },
          '.MuiBox-root.crm-dashboard__control-item--warning': {
            borderColor: alpha(theme.palette.warning.main, isLight ? 0.22 : 0.3),
            backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.warning.main, isLight ? 0.08 : 0.14)} 0%, ${alpha(theme.palette.background.paper, isLight ? 0.86 : 0.62)} 100%)`
          },
          '.MuiBox-root.crm-dashboard__control-item--negative, .MuiBox-root.crm-dashboard__control-item--neutral': {
            borderColor: alpha(theme.palette.primary.main, isLight ? 0.18 : 0.26),
            backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, isLight ? 0.06 : 0.12)} 0%, ${alpha(theme.palette.background.paper, isLight ? 0.86 : 0.62)} 100%)`
          },
          '.MuiStack-root.crm-dashboard__control-item-copy': {
            minWidth: 0,
            flex: 1
          },
          '.MuiTypography-root.crm-dashboard__control-item-label': {
            fontWeight: 620,
            color: theme.palette.text.primary
          },
          '.MuiTypography-root.crm-dashboard__control-item-note': {
            color: alpha(theme.palette.text.secondary, 0.9),
            lineHeight: 1.5
          },
          '.MuiTypography-root.crm-dashboard__control-item-value': {
            flexShrink: 0,
            fontWeight: 700,
            color: theme.palette.text.primary,
            letterSpacing: '0.01em'
          },
          '.MuiPaper-root.crm-dashboard__actions-card': {
            minHeight: 0
          },
          '.MuiBox-root.crm-dashboard__actions-grid': {
            position: 'relative',
            zIndex: 1,
            display: 'grid',
            gap: theme.spacing(0.65),
            gridTemplateColumns: 'minmax(0, 1fr)'
          },
          '.MuiPaper-root.crm-dashboard__quick-action-empty': {
            ...getInsetSurface(theme, {
              radius: 14,
              backgroundAlpha: isLight ? 0.76 : 0.56,
              borderAlpha: isLight ? 0.08 : 0.14,
              shadowAlpha: isLight ? 0.05 : 0.1
            }),
            padding: theme.spacing(1, 1.05),
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(0.35)
          },
          '.MuiButton-root.crm-dashboard__quick-action': {
            width: '100%',
            justifyContent: 'flex-start',
            alignItems: 'stretch',
            padding: theme.spacing(0.9, 1),
            minHeight: 0,
            borderRadius: 14,
            textAlign: 'left',
            color: theme.palette.text.primary,
            borderColor: alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14),
            backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.76 : 0.52),
            boxShadow: 'none',
            '&:hover': {
              borderColor: alpha(theme.palette.primary.main, isLight ? 0.22 : 0.3),
              backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.08 : 0.14),
              boxShadow: 'none'
            }
          },
          '.MuiStack-root.crm-dashboard__quick-action-content': {
            width: '100%',
            minWidth: 0
          },
          '.MuiBox-root.crm-dashboard__quick-action-icon': {
            width: 34,
            height: 34,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: theme.palette.primary.main,
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.08 : 0.16),
            border: `1px solid ${alpha(theme.palette.primary.main, isLight ? 0.16 : 0.24)}`
          },
          '.MuiStack-root.crm-dashboard__quick-action-copy': {
            minWidth: 0,
            flex: 1
          },
          '.MuiTypography-root.crm-dashboard__quick-action-label': {
            fontWeight: 620,
            color: theme.palette.text.primary
          },
          '.MuiTypography-root.crm-dashboard__quick-action-note': {
            color: alpha(theme.palette.text.secondary, 0.9),
            lineHeight: 1.45,
            whiteSpace: 'normal'
          },
          '.MuiStack-root.crm-dashboard__hero-kpis': {
            alignItems: 'flex-start',
            gap: theme.spacing(0.8),
            [theme.breakpoints.up('md')]: {
              alignItems: 'flex-end'
            }
          },
          '.MuiBox-root.crm-dashboard__hero-kpi': {
            ...buildGlassSurface(theme, {
              radius: 16,
              borderAlpha: isLight ? 0.08 : 0.14,
              backgroundAlpha: isLight ? 0.96 : 0.9,
              blur: 8,
              shadowAlpha: isLight ? 0.06 : 0.14
            }),
            minWidth: 164,
            padding: theme.spacing(0.95, 1.2),
            textAlign: 'right'
          },
          '.MuiChip-root.crm-dashboard__hero-chip': {
            borderColor: alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14),
            backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.9 : 0.82),
            color: theme.palette.text.primary,
            fontWeight: 620
          },

          '.MuiBox-root.crm-dashboard__metrics-grid': {
            display: 'grid',
            gap: theme.spacing(1.5),
            gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
            [theme.breakpoints.up('sm')]: {
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
            },
            [theme.breakpoints.up('xl')]: {
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))'
            }
          },
          '.MuiPaper-root.crm-dashboard__metric-card': {
            ...getDashboardGlass(theme),
            padding: theme.spacing(1.8),
            minHeight: 172,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            animation: `crm-fade-in ${microMotion}`,
            ...getHoverLift(theme)
          },
          '.MuiStack-root.crm-dashboard__metric-header': {
            position: 'relative',
            zIndex: 1,
            alignItems: 'center',
            justifyContent: 'space-between'
          },
          '.MuiStack-root.crm-dashboard__metric-copy': {
            position: 'relative',
            zIndex: 1,
            gap: theme.spacing(0.4)
          },
          '.MuiTypography-root.crm-dashboard__metric-label': {
            color: alpha(theme.palette.text.secondary, 0.88)
          },
          '.MuiTypography-root.crm-dashboard__metric-subtitle': {
            maxWidth: '24rem',
            color: theme.palette.text.secondary
          },
          '.MuiStack-root.crm-dashboard__metric-footer': {
            position: 'relative',
            zIndex: 1,
            marginTop: 'auto',
            gap: theme.spacing(0.75)
          },
          '.MuiBox-root.crm-dashboard__metric-icon': {
            width: 38,
            height: 38,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.08 : 0.16),
            border: `1px solid ${alpha(theme.palette.primary.main, isLight ? 0.16 : 0.26)}`,
            color: theme.palette.primary.main,
            transition: `transform ${microMotion}, background-color ${microMotion}`
          },
          '.MuiPaper-root.crm-dashboard__metric-card:hover .MuiBox-root.crm-dashboard__metric-icon': {
            transform: 'translateY(-1px)',
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.12 : 0.2)
          },
          '.MuiStack-root.crm-dashboard__metric-delta': {
            fontSize: '0.74rem',
            fontWeight: 650,
            letterSpacing: '0.02em'
          },
          '.MuiStack-root.crm-dashboard__metric-delta--positive': {
            color: theme.palette.success.main
          },
          '.MuiStack-root.crm-dashboard__metric-delta--negative': {
            color: theme.palette.error.main
          },
          '.MuiTypography-root.crm-dashboard__metric-value': {
            letterSpacing: '-0.03em'
          },
          '.MuiBox-root.crm-dashboard__sparkline': {
            width: '100%',
            height: 38,
            '& svg': {
              width: '100%',
              height: '100%'
            },
            '& polyline': {
              fill: 'none',
              stroke: alpha(theme.palette.primary.main, isLight ? 0.72 : 0.88),
              strokeWidth: 2,
              strokeLinecap: 'round',
              strokeLinejoin: 'round'
            }
          },

          '.MuiBox-root.crm-dashboard__analytics-grid': {
            display: 'grid',
            gap: theme.spacing(1.5),
            gridTemplateColumns: 'minmax(0, 1fr)',
            [theme.breakpoints.up('lg')]: {
              gridTemplateColumns: 'minmax(0, 1.18fr) minmax(0, 0.82fr)'
            }
          },
          '.MuiPaper-root.crm-dashboard__chart-card': {
            ...getDashboardGlass(theme),
            padding: theme.spacing(1.9),
            animation: `crm-fade-in ${microMotion}`,
            ...getHoverLift(theme),
            minWidth: 0
          },
          '.MuiPaper-root.crm-dashboard__chart-card--primary': {
            minHeight: '100%'
          },
          '.MuiPaper-root.crm-dashboard__chart-card--mix': {
            minHeight: 0
          },
          '.MuiStack-root.crm-dashboard__side-stack': {
            height: '100%',
            gap: theme.spacing(1.5)
          },
          '.MuiStack-root.crm-dashboard__chart-header, .MuiStack-root.crm-dashboard__panel-header': {
            position: 'relative',
            zIndex: 1,
            paddingBottom: theme.spacing(0.8),
            marginBottom: 0,
            borderBottom: `1px solid ${border.soft || alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14)}`
          },
          '.MuiChip-root.crm-dashboard__chart-chip': {
            borderColor: alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14),
            backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.92 : 0.84)
          },
          '.MuiBox-root.crm-dashboard__area-chart': {
            width: '100%',
            height: 232,
            '& svg': {
              width: '100%',
              height: '100%'
            },
            '& line': {
              stroke: alpha(theme.palette.divider, isLight ? 0.66 : 0.54),
              strokeWidth: 1
            },
            '& path.crm-dashboard__area-fill': {
              fill: 'url(#crm-trend-fill)'
            },
            '& path.crm-dashboard__area-line': {
              fill: 'none',
              stroke: alpha(theme.palette.primary.main, isLight ? 0.8 : 0.9),
              strokeWidth: 2.4,
              strokeLinecap: 'round',
              strokeLinejoin: 'round'
            },
            '& circle': {
              fill: theme.palette.background.paper,
              stroke: alpha(theme.palette.primary.main, isLight ? 0.82 : 0.94),
              strokeWidth: 1.8
            }
          },
          '.MuiBox-root.crm-dashboard__chart-legend': {
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: theme.spacing(1.1),
            [theme.breakpoints.up('md')]: {
              gridTemplateColumns: 'repeat(6, minmax(0, 1fr))'
            }
          },
          '.MuiBox-root.crm-dashboard__chart-meta-grid': {
            position: 'relative',
            zIndex: 1,
            display: 'grid',
            gap: theme.spacing(1),
            gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
            [theme.breakpoints.up('sm')]: {
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
            }
          },
          '.MuiBox-root.crm-dashboard__chart-meta-card': {
            ...getInsetSurface(theme, {
              radius: 14,
              backgroundAlpha: isLight ? 0.76 : 0.56,
              borderAlpha: isLight ? 0.08 : 0.14,
              shadowAlpha: isLight ? 0.05 : 0.12
            }),
            padding: theme.spacing(1.15, 1.2),
            minWidth: 0,
            gap: theme.spacing(0.3)
          },
          '.MuiTypography-root.crm-dashboard__chart-meta-label': {
            color: alpha(theme.palette.text.secondary, 0.9),
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          },
          '.MuiTypography-root.crm-dashboard__chart-meta-value': {
            fontWeight: 650,
            color: theme.palette.text.primary
          },
          '.MuiTypography-root.crm-dashboard__chart-meta-note': {
            color: alpha(theme.palette.text.secondary, 0.9)
          },
          '.MuiStack-root.crm-dashboard__mix-list': {
            marginTop: theme.spacing(0.35),
            gap: theme.spacing(0.8)
          },
          '.MuiStack-root.crm-dashboard__mix-row': {
            gap: theme.spacing(0.55)
          },
          '.MuiBox-root.crm-dashboard__mix-track': {
            width: '100%',
            height: 8,
            borderRadius: 999,
            backgroundColor: alpha(theme.palette.text.primary, isLight ? 0.06 : 0.12),
            overflow: 'hidden'
          },
          '.MuiBox-root.crm-dashboard__mix-fill': {
            height: '100%',
            borderRadius: 999,
            background: gradients.buttonPrimary
          },

          '.MuiBox-root.crm-dashboard__lower-grid': {
            display: 'grid',
            gap: theme.spacing(1.5),
            gridTemplateColumns: 'minmax(0, 1fr)',
            [theme.breakpoints.up('lg')]: {
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 0.92fr)'
            }
          },
          '.MuiPaper-root.crm-dashboard__activity-card, .MuiPaper-root.crm-dashboard__indicator-card': {
            ...getDashboardGlass(theme),
            padding: theme.spacing(1.9),
            animation: `crm-fade-in ${microMotion}`,
            ...getHoverLift(theme)
          },
          '.MuiPaper-root.crm-dashboard__activity-card--full': {
            minWidth: 0
          },
          '.MuiStack-root.crm-dashboard__activity-list': {
            gap: theme.spacing(0.55)
          },
          '.MuiStack-root.crm-dashboard__activity-row': {
            padding: theme.spacing(0.35, 0),
            minWidth: 0
          },
          '.MuiStack-root.crm-dashboard__activity-copy': {
            width: '100%',
            minWidth: 0
          },
          '.MuiBox-root.crm-dashboard__activity-dot': {
            width: 9,
            height: 9,
            borderRadius: '50%',
            marginTop: theme.spacing(0.78),
            flexShrink: 0,
            boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, isLight ? 0.06 : 0.12)}`
          },
          '.MuiBox-root.crm-dashboard__activity-dot--success': {
            backgroundColor: theme.palette.success.main
          },
          '.MuiBox-root.crm-dashboard__activity-dot--warning': {
            backgroundColor: theme.palette.warning.main
          },
          '.MuiBox-root.crm-dashboard__activity-dot--neutral': {
            backgroundColor: theme.palette.info.main
          },

          '.MuiStack-root.crm-dashboard__indicator-row': {
            padding: theme.spacing(0.35, 0),
            gap: theme.spacing(0.58)
          },
          '.MuiBox-root.crm-dashboard__indicator-icon': {
            width: 28,
            height: 28,
            borderRadius: 9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.palette.primary.main,
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.08 : 0.16),
            border: `1px solid ${alpha(theme.palette.primary.main, isLight ? 0.16 : 0.26)}`
          },
          '.MuiTypography-root.crm-dashboard__indicator-value': {
            fontWeight: 630,
            letterSpacing: '0.01em'
          },
          '.MuiTypography-root.crm-dashboard__indicator-value--positive': {
            color: theme.palette.success.main
          },
          '.MuiTypography-root.crm-dashboard__indicator-value--warning': {
            color: theme.palette.warning.main
          },
          '.MuiTypography-root.crm-dashboard__indicator-value--neutral': {
            color: theme.palette.info.main
          },
          '.MuiBox-root.crm-dashboard__indicator-track': {
            width: '100%',
            height: 7,
            borderRadius: 999,
            overflow: 'hidden',
            backgroundColor: alpha(theme.palette.text.primary, isLight ? 0.06 : 0.12)
          },
          '.MuiBox-root.crm-dashboard__indicator-fill': {
            height: '100%',
            borderRadius: 999,
            background: gradients.buttonPrimary
          },
          '.MuiBox-root.crm-dashboard__indicator-fill--warning': {
            background: `linear-gradient(120deg, ${theme.palette.warning.main} 0%, ${alpha(theme.palette.warning.main, 0.72)} 100%)`
          },
          '.MuiBox-root.crm-dashboard__indicator-fill--neutral': {
            background: `linear-gradient(120deg, ${theme.palette.info.main} 0%, ${alpha(theme.palette.info.main, 0.72)} 100%)`
          },

          '.MuiBox-root.crm-client-detail-page': {
            position: 'relative',
            isolation: 'isolate',
            '--crm-client-detail-shell-gap': theme.spacing(1.15),
            '--crm-client-detail-header-height': 'clamp(248px, 34dvh, 320px)',
            minHeight: 0,
            height: 'calc(100dvh - var(--layout-header-height) - var(--layout-content-padding-y) - var(--layout-content-padding-y) - 12px)',
            maxHeight:
              'calc(100dvh - var(--layout-header-height) - var(--layout-content-padding-y) - var(--layout-content-padding-y) - 12px)',
            overflow: 'hidden'
          },
          '.MuiBox-root.crm-client-detail__shell': {
            height: '100%',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--crm-client-detail-shell-gap)'
          },
          '.MuiBox-root.crm-client-detail__header-zone': {
            flex: '0 0 var(--crm-client-detail-header-height)',
            height: 'var(--crm-client-detail-header-height)',
            minHeight: 0,
            maxHeight: 'var(--crm-client-detail-header-height)'
          },
          '.MuiBox-root.crm-client-detail__score-zone': {
            flex: '0 0 auto',
            minHeight: 0
          },
          '.MuiBox-root.crm-client-detail__operations-zone': {
            flex: '1 1 0%',
            minHeight: 0
          },
          '.MuiPaper-root.crm-client-detail__hero, .MuiPaper-root.crm-client-detail__tabs-shell, .MuiPaper-root.crm-layout-admin-panel, .MuiPaper-root.crm-layout-admin-panel__widget, .MuiPaper-root.crm-saldo-fields__syntax-help, .MuiPaper-root.crm-credit-import__empty-notice, .MuiCard-root.crm-credit-import__upload-card, .MuiPaper-root.crm-groups__permissions-panel, .MuiPaper-root.crm-card-outline': {
            ...getCardSurface(theme, { soft: true })
          },
          '.MuiPaper-root.crm-client-detail__header-shell': {
            ...getCardSurface(theme, { soft: true }),
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
            padding: theme.spacing(1.05),
            display: 'flex',
            flexDirection: 'column'
          },
          '.MuiBox-root.crm-client-detail__header-grid': {
            display: 'grid',
            gap: theme.spacing(0.95),
            gridTemplateColumns: 'minmax(0, 1.08fr) minmax(0, 1.16fr) minmax(0, 0.96fr)',
            minHeight: 0,
            height: '100%',
            alignItems: 'stretch',
            [theme.breakpoints.down('lg')]: {
              gridAutoFlow: 'column',
              gridAutoColumns: 'minmax(260px, 76vw)',
              gridTemplateColumns: 'none',
              overflowX: 'auto',
              overflowY: 'hidden',
              WebkitOverflowScrolling: 'touch',
              scrollbarGutter: 'stable both-edges',
              paddingBottom: theme.spacing(0.2)
            }
          },
          '.MuiPaper-root.crm-client-detail__header-card': {
            ...getInsetSurface(theme, {
              radius: 18,
              backgroundAlpha: isLight ? 0.8 : 0.6,
              borderAlpha: isLight ? 0.08 : 0.14,
              shadowAlpha: isLight ? 0.05 : 0.12
            }),
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(0.52),
            padding: theme.spacing(0.92, 1)
          },
          '.MuiStack-root.crm-client-detail__header-card-head': {
            gap: theme.spacing(0.55),
            minWidth: 0,
            flexShrink: 0
          },
          '.MuiBox-root.crm-client-detail__header-card-body': {
            flex: '1 1 auto',
            minHeight: 0,
            overflowX: 'hidden',
            overflowY: 'auto',
            paddingRight: theme.spacing(0.12),
            scrollbarGutter: 'stable',
            '&::-webkit-scrollbar': {
              width: 6,
              height: 6
            },
            '&::-webkit-scrollbar-thumb': {
              borderRadius: 999,
              backgroundColor: alpha(theme.palette.text.secondary, isLight ? 0.18 : 0.26)
            },
            '&::-webkit-scrollbar-track': {
              borderRadius: 999,
              backgroundColor: alpha(theme.palette.text.primary, isLight ? 0.04 : 0.08)
            }
          },
          '.MuiBox-root.crm-client-detail__header-card-body--contacts': {
            paddingRight: theme.spacing(0.28)
          },
          '.MuiStack-root.crm-client-detail__header-card-copy': {
            gap: theme.spacing(0.22),
            minWidth: 0,
            flex: 1
          },
          '.MuiTypography-root.crm-client-detail__header-title': {
            fontWeight: 680,
            fontSize: 'clamp(1.06rem, 1.15vw, 1.34rem)',
            lineHeight: 1.04,
            letterSpacing: '-0.028em',
            color: theme.palette.text.primary
          },
          '.MuiTypography-root.crm-client-detail__header-subtitle, .MuiTypography-root.crm-client-detail__header-section-subtitle': {
            color: alpha(theme.palette.text.secondary, 0.9),
            fontSize: '0.82rem',
            lineHeight: 1.4
          },
          '.MuiTypography-root.crm-client-detail__header-section-title': {
            fontWeight: 630,
            fontSize: '0.96rem',
            lineHeight: 1.2,
            letterSpacing: '-0.012em',
            color: theme.palette.text.primary
          },
          '.MuiButton-root.crm-client-detail__back-button': {
            minHeight: 34,
            padding: theme.spacing(0.55, 1.05),
            borderRadius: 12,
            flexShrink: 0
          },
          '.MuiBox-root.crm-client-detail__header-summary-grid': {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: theme.spacing(0.7),
            minWidth: 0
          },
          '.MuiBox-root.crm-client-detail__header-summary-grid--compact': {
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
          },
          '.MuiBox-root.crm-client-detail__header-summary-item': {
            ...getInsetSurface(theme, {
              radius: 14,
              backgroundAlpha: isLight ? 0.78 : 0.56,
              borderAlpha: isLight ? 0.08 : 0.14,
              shadowAlpha: isLight ? 0.04 : 0.1
            }),
            minWidth: 0,
            padding: theme.spacing(0.8, 0.9),
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(0.18),
            justifyContent: 'center'
          },
          '.MuiBox-root.crm-client-detail__header-summary-item .MuiTypography-root.crm-surface-card__meta-value': {
            whiteSpace: 'normal',
            overflowWrap: 'anywhere',
            lineHeight: 1.24
          },
          '.MuiBox-root.crm-client-detail__indicator-grid': {
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: theme.spacing(0.55),
            minWidth: 0
          },
          '.MuiBox-root.crm-client-detail__indicator-card': {
            ...getInsetSurface(theme, {
              radius: 13,
              backgroundAlpha: isLight ? 0.82 : 0.6,
              borderAlpha: isLight ? 0.08 : 0.14,
              shadowAlpha: isLight ? 0.04 : 0.1
            }),
            minWidth: 0,
            padding: theme.spacing(0.68, 0.78),
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(0.22),
            justifyContent: 'center'
          },
          '.MuiBox-root.crm-client-detail__indicator-card--success': {
            backgroundColor: alpha(theme.palette.success.main, isLight ? 0.08 : 0.12),
            borderColor: alpha(theme.palette.success.main, isLight ? 0.14 : 0.24)
          },
          '.MuiBox-root.crm-client-detail__indicator-card--warning': {
            backgroundColor: alpha(theme.palette.warning.main, isLight ? 0.09 : 0.13),
            borderColor: alpha(theme.palette.warning.main, isLight ? 0.16 : 0.26)
          },
          '.MuiBox-root.crm-client-detail__indicator-card--danger': {
            backgroundColor: alpha(theme.palette.error.main, isLight ? 0.08 : 0.12),
            borderColor: alpha(theme.palette.error.main, isLight ? 0.14 : 0.24)
          },
          '.MuiTypography-root.crm-client-detail__indicator-label': {
            fontSize: '0.62rem',
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: alpha(theme.palette.text.secondary, 0.86)
          },
          '.MuiTypography-root.crm-client-detail__indicator-value': {
            fontWeight: 670,
            fontSize: '0.9rem',
            lineHeight: 1.18,
            letterSpacing: '-0.01em',
            color: theme.palette.text.primary
          },
          '.MuiStack-root.crm-client-detail__header-chip-row': {
            marginTop: 'auto',
            alignItems: 'center',
            gap: theme.spacing(0.55)
          },
          '.MuiStack-root.crm-client-detail__contact-groups, .MuiStack-root.crm-client-detail__credit-preview-list': {
            gap: theme.spacing(0.42),
            minHeight: 0
          },
          '.MuiStack-root.crm-client-detail__contact-group': {
            display: 'grid',
            gridTemplateColumns: '68px minmax(0, 1fr)',
            alignItems: 'start',
            gap: theme.spacing(0.45),
            minWidth: 0,
            minHeight: 0
          },
          '.MuiTypography-root.crm-client-detail__contact-group-title': {
            fontSize: '0.66rem',
            fontWeight: 700,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color: alpha(theme.palette.text.secondary, 0.9),
            paddingTop: theme.spacing(0.45)
          },
          '.MuiStack-root.crm-client-detail__contact-card-list': {
            flexDirection: 'row',
            alignItems: 'stretch',
            gap: theme.spacing(0.34),
            minWidth: 0,
            minHeight: 0,
            overflowX: 'auto',
            overflowY: 'hidden',
            WebkitOverflowScrolling: 'touch',
            scrollbarGutter: 'stable both-edges',
            paddingBottom: theme.spacing(0.18)
          },
          '.MuiBox-root.crm-client-detail__contact-card, .MuiBox-root.crm-client-detail__credit-preview-item': {
            ...getInsetSurface(theme, {
              radius: 13,
              backgroundAlpha: isLight ? 0.78 : 0.56,
              borderAlpha: isLight ? 0.08 : 0.14,
              shadowAlpha: isLight ? 0.035 : 0.09
            }),
            minWidth: 0,
            flex: '0 0 clamp(182px, 19vw, 246px)',
            padding: theme.spacing(0.4, 0.55),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: theme.spacing(0.55)
          },
          '.MuiBox-root.crm-client-detail__contact-card--address': {
            flexBasis: 'clamp(220px, 26vw, 340px)',
            alignItems: 'flex-start'
          },
          '.MuiBox-root.crm-client-detail__contact-card--empty': {
            flex: '1 1 auto',
            justifyContent: 'flex-start',
            minHeight: 32
          },
          '.MuiSvgIcon-root.crm-client-detail__contact-icon': {
            color: alpha(theme.palette.primary.main, 0.9),
            flexShrink: 0
          },
          '.MuiTypography-root.crm-client-detail__contact-card-value': {
            flex: 1,
            minWidth: 0,
            fontWeight: 600,
            fontSize: '0.78rem',
            lineHeight: 1.3,
            color: theme.palette.text.primary,
            whiteSpace: 'normal',
            overflow: 'visible',
            textOverflow: 'clip',
            wordBreak: 'break-word'
          },
          '.MuiTypography-root.crm-client-detail__contact-card-value--multiline': {
            display: 'block'
          },
          '.MuiStack-root.crm-client-detail__contact-card-actions': {
            flexShrink: 0,
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: theme.spacing(0.28)
          },
          '.MuiButton-root.crm-client-detail__contact-action': {
            minHeight: 24,
            minWidth: 0,
            padding: theme.spacing(0.18, 0.65),
            borderRadius: 999,
            fontSize: '0.68rem',
            lineHeight: 1,
            letterSpacing: '0.01em',
            color: alpha(theme.palette.text.secondary, 0.96),
            '&.Mui-disabled': {
              color: alpha(theme.palette.text.secondary, 0.46)
            }
          },
          '.MuiTypography-root.crm-client-detail__contact-more': {
            fontSize: '0.68rem',
            fontWeight: 600,
            letterSpacing: '0.01em',
            color: alpha(theme.palette.text.secondary, 0.84),
            paddingLeft: theme.spacing(0.2)
          },
          '.MuiBox-root.crm-client-detail__credit-preview-item': {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: theme.spacing(0.8)
          },
          '.MuiTypography-root.crm-client-detail__credit-preview-value': {
            flexShrink: 0,
            fontWeight: 650,
            color: theme.palette.text.primary,
            fontVariantNumeric: 'tabular-nums'
          },
          '.MuiPaper-root.crm-client-detail__operations-shell': {
            ...getCardSurface(theme, { soft: true }),
            minHeight: 0,
            height: '100%',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            padding: theme.spacing(0.55)
          },
          '.MuiPaper-root.crm-client-detail__hero': {
            padding: theme.spacing(2.1)
          },
          '.MuiStack-root.crm-client-detail__hero-header': {
            gap: theme.spacing(1.1)
          },
          '.MuiStack-root.crm-client-detail__hero-copy': {
            maxWidth: 680
          },
          '.MuiTypography-root.crm-client-detail__hero-title': {
            letterSpacing: '-0.032em'
          },
          '.MuiTypography-root.crm-client-detail__hero-subtitle': {
            color: alpha(theme.palette.text.secondary, 0.92)
          },
          '.MuiStack-root.crm-client-detail__hero-chip-row': {
            alignItems: 'center',
            justifyContent: 'flex-end',
            [theme.breakpoints.down('lg')]: {
              justifyContent: 'flex-start'
            }
          },
          '.MuiPaper-root.crm-client-detail__tabs-shell, .MuiBox-root.crm-client-detail__tabs-shell': {
            flexShrink: 0,
            padding: theme.spacing(0, 0.2),
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            borderBottom: `1px solid ${border.soft || alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14)}`
          },
          '.MuiTabs-root.crm-client-detail__tabs': {
            width: '100%',
            minHeight: 40,
            '& .MuiTabs-scroller': {
              width: '100%'
            },
            '& .MuiTabs-flexContainer': {
              width: 'max-content',
              minWidth: '100%',
              gap: theme.spacing(0.1),
              [theme.breakpoints.up('md')]: {
                width: '100%'
              }
            },
            '& .MuiTabs-indicator': {
              height: 2,
              borderRadius: 999,
              backgroundColor: theme.palette.primary.main,
              transition: theme.transitions.create(['left', 'width'], {
                duration: motionTokens.microDurationMs,
                easing: motionTokens.microEasing
              })
            },
            '& .MuiTab-root': {
              minHeight: 40,
              minWidth: 0,
              padding: theme.spacing(0.85, 1.15),
              borderRadius: 0,
              flex: '0 0 auto',
              color: alpha(theme.palette.text.secondary, 0.82),
              fontSize: '0.78rem',
              fontWeight: 600,
              letterSpacing: '0.01em',
              textTransform: 'none',
              transition: theme.transitions.create(['color', 'background-color'], {
                duration: motionTokens.microDurationMs,
                easing: motionTokens.microEasing
              }),
              [theme.breakpoints.up('md')]: {
                flex: '1 1 0',
                maxWidth: 'none'
              },
              '&:hover': {
                backgroundColor: 'transparent',
                color: alpha(theme.palette.text.primary, 0.92)
              },
              '&.Mui-selected': {
                color: theme.palette.text.primary
              }
            }
          },
          '.MuiBox-root.crm-client-detail__operations-content': {
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            padding: theme.spacing(1, 0.25, 0.25),
            scrollbarGutter: 'stable both-edges',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain'
          },
          '.MuiBox-root.crm-client-detail__tab-panel': {
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(1.25),
            minWidth: 0,
            minHeight: '100%'
          },
          '.MuiBox-root.crm-negotiations': {
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(1.1),
            minHeight: '100%',
            height: '100%'
          },
          '.MuiBox-root.crm-negotiations__grid': {
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gap: theme.spacing(1.1),
            gridTemplateColumns: 'minmax(0, 1fr)',
            [theme.breakpoints.up('lg')]: {
              gridTemplateColumns: 'minmax(0, 1.22fr) minmax(340px, 0.78fr)'
            }
          },
          '.MuiPaper-root.crm-negotiations__panel': {
            minHeight: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          },
          '.MuiStack-root.crm-negotiations__panel-stack': {
            minHeight: 0,
            height: '100%'
          },
          '.MuiBox-root.crm-negotiations__summary-grid': {
            [theme.breakpoints.up('xl')]: {
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))'
            }
          },
          '.MuiBox-root.crm-negotiations__composer-grid': {
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gap: theme.spacing(1.1),
            gridTemplateColumns: 'minmax(0, 1fr)',
            [theme.breakpoints.up('xl')]: {
              gridTemplateColumns: 'minmax(0, 1.02fr) minmax(320px, 0.98fr)'
            }
          },
          '.MuiStack-root.crm-negotiations__composer-column': {
            minHeight: 0
          },
          '.MuiBox-root.crm-negotiations__credit-picker': {
            ...getInsetSurface(theme),
            minHeight: 0,
            padding: theme.spacing(1.05, 1.1)
          },
          '.MuiBox-root.crm-negotiations__credit-picker-list': {
            display: 'grid',
            gap: theme.spacing(0.75),
            gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
            maxHeight: 204,
            overflow: 'auto',
            paddingRight: theme.spacing(0.2),
            [theme.breakpoints.up('sm')]: {
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
            }
          },
          '.MuiBox-root.crm-negotiations__credit-item': {
            minHeight: 0,
            '& .MuiFormControlLabel-root': {
              margin: 0,
              width: '100%',
              alignItems: 'flex-start'
            },
            '& .MuiCheckbox-root': {
              paddingTop: theme.spacing(0.35)
            },
            '& .MuiFormControlLabel-label': {
              width: '100%'
            }
          },
          '.MuiBox-root.crm-negotiations__terms-grid': {
            display: 'grid',
            gap: theme.spacing(1),
            gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
            [theme.breakpoints.up('sm')]: {
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
            }
          },
          '.MuiBox-root.crm-negotiations__schedule-panel': {
            minHeight: 0
          },
          '.MuiStack-root.crm-negotiations__schedule-list': {
            gap: theme.spacing(0.7)
          },
          '.MuiBox-root.crm-negotiations__schedule-row': {
            display: 'grid',
            gap: theme.spacing(0.75),
            gridTemplateColumns: '68px minmax(0, 1fr) auto',
            alignItems: 'center',
            padding: theme.spacing(0.85, 1),
            borderRadius: 14,
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.04 : 0.1),
            border: `1px solid ${alpha(theme.palette.primary.main, isLight ? 0.08 : 0.16)}`
          },
          '.MuiBox-root.crm-negotiations__schedule-row--editable': {
            gridTemplateColumns: '64px minmax(150px, 1fr) minmax(126px, 0.82fr)',
            [theme.breakpoints.down('sm')]: {
              gridTemplateColumns: '1fr',
              '& .crm-negotiations__schedule-index': {
                marginBottom: theme.spacing(0.1)
              }
            }
          },
          '.MuiTypography-root.crm-negotiations__schedule-index': {
            fontWeight: 700,
            color: alpha(theme.palette.text.secondary, 0.9)
          },
          '.MuiTextField-root.crm-negotiations__schedule-field': {
            width: '100%',
            '& .MuiOutlinedInput-root': {
              minHeight: 40
            },
            '& .MuiOutlinedInput-input': {
              paddingTop: theme.spacing(1.05),
              paddingBottom: theme.spacing(1.05)
            }
          },
          '.MuiTypography-root.crm-negotiations__schedule-date': {
            color: theme.palette.text.primary
          },
          '.MuiTypography-root.crm-negotiations__schedule-amount': {
            fontWeight: 650,
            color: theme.palette.text.primary,
            fontVariantNumeric: 'tabular-nums'
          },
          '.MuiBox-root.crm-negotiations__schedule-total': {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: theme.spacing(1),
            paddingTop: theme.spacing(0.35),
            marginTop: theme.spacing(0.15),
            borderTop: `1px solid ${alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14)}`
          },
          '.MuiBox-root.crm-negotiations__schedule-empty': {
            padding: theme.spacing(1.1, 0.25, 0.45)
          },
          '.MuiBox-root.crm-negotiations__history-table': {
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            '& .crm-table-shell': {
              height: '100%'
            }
          },
          '.MuiBox-root.crm-negotiations__active-grid': {
            display: 'grid',
            gap: theme.spacing(1),
            gridTemplateColumns: 'minmax(0, 1fr)',
            [theme.breakpoints.up('md')]: {
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
            }
          },
          '.MuiBox-root.crm-negotiations__block': {
            minHeight: 0
          },
          '.MuiStack-root.crm-gestiones__quick-actions': {
            gap: theme.spacing(0.65)
          },
          '.MuiStack-root.crm-credit-detail__stack': {
            gap: theme.spacing(1.1),
            minHeight: 0
          },
          '.MuiPaper-root.crm-credit-detail__item': {
            minWidth: 0
          },
          '.MuiBox-root.crm-credit-detail__item-scroll': {
            width: '100%',
            overflowX: 'auto',
            overflowY: 'hidden',
            WebkitOverflowScrolling: 'touch'
          },
          '.MuiBox-root.crm-credit-detail__row': {
            display: 'flex',
            alignItems: 'stretch',
            gap: theme.spacing(0.8),
            minWidth: 'max-content'
          },
          '.MuiBox-root.crm-credit-detail__lead': {
            ...getInsetSurface(theme, {
              radius: 14,
              backgroundAlpha: isLight ? 0.82 : 0.62,
              borderAlpha: isLight ? 0.08 : 0.14,
              shadowAlpha: isLight ? 0.04 : 0.1
            }),
            width: 220,
            minWidth: 220,
            padding: theme.spacing(0.85, 1),
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: theme.spacing(0.18)
          },
          '.MuiBox-root.crm-credit-detail__inline-strip': {
            display: 'flex',
            alignItems: 'stretch',
            gap: theme.spacing(0.72),
            minWidth: 0
          },
          '.MuiBox-root.crm-credit-detail__info-item': {
            ...getInsetSurface(theme, {
              radius: 13,
              backgroundAlpha: isLight ? 0.78 : 0.58,
              borderAlpha: isLight ? 0.08 : 0.14,
              shadowAlpha: isLight ? 0.04 : 0.1
            }),
            minWidth: 132,
            padding: theme.spacing(0.78, 0.9),
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: theme.spacing(0.14)
          },
          '.MuiTypography-root.crm-credit-detail__section-label': {
            fontWeight: 700,
            fontSize: '0.68rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: alpha(theme.palette.text.secondary, 0.88)
          },
          '.MuiBox-root.crm-credit-detail__balance-item': {
            ...getInsetSurface(theme, {
              radius: 13,
              backgroundAlpha: isLight ? 0.8 : 0.58,
              borderAlpha: isLight ? 0.08 : 0.14,
              shadowAlpha: isLight ? 0.04 : 0.1
            }),
            minWidth: 0,
            padding: theme.spacing(0.78, 0.9),
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(0.14),
            justifyContent: 'center'
          },
          '.MuiBox-root.crm-credit-detail__balance-item--empty': {
            minWidth: 180
          },
          '.MuiTypography-root.crm-credit-detail__balance-label': {
            fontWeight: 650,
            fontSize: '0.68rem',
            letterSpacing: '0.04em',
            color: alpha(theme.palette.text.secondary, 0.9)
          },
          '.MuiTypography-root.crm-credit-detail__balance-value': {
            fontWeight: 650,
            lineHeight: 1.24,
            color: theme.palette.text.primary,
            overflowWrap: 'anywhere'
          },
          '.MuiTypography-root.crm-credit-detail__balance-caption': {
            color: alpha(theme.palette.primary.main, 0.9),
            fontWeight: 620
          },
          '.MuiStack-root.crm-gestiones__quick-actions .MuiButton-root': {
            minHeight: 32,
            padding: theme.spacing(0.45, 1),
            borderRadius: 11,
            fontSize: '0.74rem'
          },
          '.MuiPaper-root.crm-gestiones__composer': {
            ...getInsetSurface(theme, {
              radius: 16,
              backgroundAlpha: isLight ? 0.82 : 0.62,
              borderAlpha: isLight ? 0.08 : 0.14,
              shadowAlpha: isLight ? 0.05 : 0.12
            }),
            padding: theme.spacing(1.1)
          },
          '.MuiChip-root.crm-gestiones__badge': {
            height: 24,
            borderRadius: 999,
            fontSize: '0.68rem',
            fontWeight: 650,
            letterSpacing: '0.01em',
            borderWidth: 1
          },
          '.MuiChip-root.crm-gestiones__badge--success': {
            color: theme.palette.success.main,
            backgroundColor: alpha(theme.palette.success.main, isLight ? 0.09 : 0.16),
            borderColor: alpha(theme.palette.success.main, isLight ? 0.18 : 0.28)
          },
          '.MuiChip-root.crm-gestiones__badge--warning': {
            color: theme.palette.warning.main,
            backgroundColor: alpha(theme.palette.warning.main, isLight ? 0.1 : 0.18),
            borderColor: alpha(theme.palette.warning.main, isLight ? 0.2 : 0.3)
          },
          '.MuiChip-root.crm-gestiones__badge--danger': {
            color: theme.palette.error.main,
            backgroundColor: alpha(theme.palette.error.main, isLight ? 0.08 : 0.16),
            borderColor: alpha(theme.palette.error.main, isLight ? 0.18 : 0.28)
          },
          '.MuiChip-root.crm-gestiones__badge--neutral': {
            color: alpha(theme.palette.text.secondary, 0.96),
            backgroundColor: alpha(theme.palette.text.secondary, isLight ? 0.08 : 0.16),
            borderColor: alpha(theme.palette.text.secondary, isLight ? 0.14 : 0.24)
          },
          '.MuiChip-root.crm-gestiones__badge--default': {
            color: theme.palette.text.secondary,
            backgroundColor: alpha(theme.palette.text.secondary, isLight ? 0.06 : 0.12),
            borderColor: alpha(theme.palette.text.secondary, isLight ? 0.12 : 0.2)
          },
          '.MuiStack-root.crm-gestiones__note-stack': {
            gap: theme.spacing(0.2),
            minWidth: 0
          },
          '.MuiTypography-root.crm-gestiones__note-text': {
            color: theme.palette.text.primary,
            lineHeight: 1.42,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          },
          '.MuiTypography-root.crm-gestiones__note-text--expanded': {
            display: 'block',
            WebkitLineClamp: 'unset',
            overflow: 'visible'
          },
          '.MuiButton-root.crm-gestiones__note-toggle': {
            alignSelf: 'flex-start',
            minHeight: 22,
            padding: theme.spacing(0.08, 0.25),
            borderRadius: 8,
            fontSize: '0.68rem',
            color: alpha(theme.palette.text.secondary, 0.94)
          },
          '.MuiBox-root.crm-gestiones__table-actions': {
            display: 'flex',
            justifyContent: 'flex-end'
          },
          '.MuiPaper-root.crm-promises__progress-card': {
            ...getInsetSurface(theme, {
              radius: 16,
              backgroundAlpha: isLight ? 0.82 : 0.62,
              borderAlpha: isLight ? 0.08 : 0.14,
              shadowAlpha: isLight ? 0.05 : 0.12
            }),
            padding: theme.spacing(1, 1.1)
          },
          '.MuiStack-root.crm-promises__summary-grid': {
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: theme.spacing(0.8),
            [theme.breakpoints.down('sm')]: {
              gridTemplateColumns: 'repeat(1, minmax(0, 1fr))'
            }
          },
          '.MuiBox-root.crm-promises__summary-item': {
            minWidth: 0
          },
          '.MuiLinearProgress-root.crm-promises__progress': {
            height: 8,
            borderRadius: 999,
            backgroundColor: alpha(theme.palette.warning.main, isLight ? 0.12 : 0.2),
            '& .MuiLinearProgress-bar': {
              borderRadius: 999,
              background: `linear-gradient(90deg, ${theme.palette.success.main} 0%, ${theme.palette.primary.main} 100%)`
            }
          },
          '.MuiChip-root.crm-promises__badge': {
            height: 24,
            borderRadius: 999,
            fontSize: '0.68rem',
            fontWeight: 650,
            letterSpacing: '0.01em',
            borderWidth: 1
          },
          '.MuiChip-root.crm-promises__badge--success': {
            color: theme.palette.success.main,
            backgroundColor: alpha(theme.palette.success.main, isLight ? 0.09 : 0.16),
            borderColor: alpha(theme.palette.success.main, isLight ? 0.18 : 0.3)
          },
          '.MuiChip-root.crm-promises__badge--warning': {
            color: theme.palette.warning.main,
            backgroundColor: alpha(theme.palette.warning.main, isLight ? 0.1 : 0.18),
            borderColor: alpha(theme.palette.warning.main, isLight ? 0.2 : 0.3)
          },
          '.MuiChip-root.crm-promises__badge--danger': {
            color: theme.palette.error.main,
            backgroundColor: alpha(theme.palette.error.main, isLight ? 0.09 : 0.16),
            borderColor: alpha(theme.palette.error.main, isLight ? 0.18 : 0.3)
          },
          '.MuiBox-root.crm-promises__table-actions': {
            display: 'flex',
            justifyContent: 'flex-end'
          },
          '.MuiStack-root.crm-layout-admin-panel__content': {
            position: 'relative',
            zIndex: 1,
            gap: theme.spacing(2.1)
          },
          '.MuiStack-root.crm-layout-admin-panel__list': {
            gap: theme.spacing(1.05)
          },
          '.MuiPaper-root.crm-layout-admin-panel__widget, .MuiPaper-root.crm-card-outline, .MuiPaper-root.crm-surface-card__list-item': {
            ...getInsetSurface(theme),
            position: 'relative',
            zIndex: 1
          },
          '.MuiFormControlLabel-root.crm-layout-admin-panel__switch': {
            margin: 0,
            gap: theme.spacing(1),
            alignItems: 'center'
          },
          '.MuiBox-root.crm-client-detail__hero-meta-item': {
            ...getInsetSurface(theme),
            minWidth: 0,
            padding: theme.spacing(1.15, 1.2),
            gap: theme.spacing(0.4)
          },

          '.MuiBox-root.crm-client-detail__hero-meta, .MuiBox-root.crm-client-detail__summary-grid, .MuiBox-root.crm-client-detail__financial-grid': {
            gap: theme.spacing(1.4)
          },
          '.MuiBox-root.crm-client-detail__hero-meta': {
            display: 'grid',
            gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
            [theme.breakpoints.up('sm')]: {
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
            },
            [theme.breakpoints.up('xl')]: {
              gridTemplateColumns: 'repeat(5, minmax(0, 1fr))'
            }
          },
          '.MuiBox-root.crm-client-detail__summary-grid, .MuiBox-root.crm-client-detail__financial-grid': {
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr)',
            [theme.breakpoints.up('lg')]: {
              gridTemplateColumns: 'minmax(0, 1.24fr) minmax(320px, 0.86fr)'
            }
          },
          '.MuiBox-root.crm-client-detail__summary-col, .MuiBox-root.crm-client-detail__financial-col': {
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(1.5)
          },
          '.MuiBox-root.crm-client-detail__summary-col--full, .MuiBox-root.crm-client-detail__financial-col--full': {
            [theme.breakpoints.up('lg')]: {
              gridColumn: '1 / -1'
            }
          },
          '.MuiPaper-root.crm-credit-import__shell': {
            padding: theme.spacing(2.1),
            [theme.breakpoints.down('sm')]: {
              padding: theme.spacing(1.25, 1.1)
            }
          },
          '.MuiBox-root.crm-credit-import__stepper-shell': {
            ...getInsetSurface(theme, {
              radius: 18,
              backgroundAlpha: isLight ? 0.76 : 0.56,
              borderAlpha: isLight ? 0.08 : 0.14,
              shadowAlpha: isLight ? 0.05 : 0.1
            }),
            padding: theme.spacing(1.45, 1.1),
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarGutter: 'stable both-edges'
          },
          '.MuiStepper-root.crm-credit-import__stepper': {
            minWidth: 640,
            [theme.breakpoints.up('md')]: {
              minWidth: 0
            }
          },
          '.MuiDivider-root.crm-credit-import__divider': {
            borderColor: alpha(theme.palette.divider, isLight ? 0.78 : 0.64)
          },
          '.MuiBox-root.crm-credit-import__step-body': {
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(2)
          },
          '.MuiPaper-root.crm-credit-import__selection-card, .MuiPaper-root.crm-credit-import__preview-shell, .MuiPaper-root.crm-credit-import__status-panel, .MuiPaper-root.crm-credit-import__strategy-row, .MuiCard-root.crm-credit-import__mapping-group, .MuiCard-root.crm-credit-import__mapping-option': {
            ...getInsetSurface(theme, {
              radius: 18,
              backgroundAlpha: isLight ? 0.8 : 0.58,
              borderAlpha: isLight ? 0.08 : 0.14,
              shadowAlpha: isLight ? 0.05 : 0.12
            })
          },
          '.MuiStack-root.crm-credit-import__mapping-stack': {
            gap: theme.spacing(2.2)
          },
          '.MuiStack-root.crm-credit-import__mapping-group-list': {
            gap: theme.spacing(1.1)
          },
          '.MuiStack-root.crm-credit-import__mapping-option-header': {
            gap: theme.spacing(1),
            paddingBottom: theme.spacing(0.15)
          },
          '.MuiTypography-root.crm-credit-import__mapping-hint': {
            color: alpha(theme.palette.text.secondary, 0.92),
            lineHeight: 1.45
          },
          '.MuiStack-root.crm-credit-import__mapping-badges': {
            alignItems: 'center',
            flexWrap: 'wrap'
          },
          '.MuiPaper-root.crm-credit-import__strategy-row': {
            padding: theme.spacing(1.5, 1.6)
          },
          '.MuiAlert-root.crm-credit-import__info-alert': {
            margin: 0
          },
          '.MuiStack-root.crm-credit-import__upload-stack': {
            minHeight: 220,
            padding: theme.spacing(1.4)
          },
          '.MuiBox-root.crm-credit-import__upload-icon': {
            width: 56,
            height: 56,
            borderRadius: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: gradients.buttonSubtle,
            border: `1px solid ${alpha(theme.palette.primary.main, isLight ? 0.16 : 0.26)}`
          },
          '.MuiLinearProgress-root.crm-credit-import__upload-progress, .MuiLinearProgress-root.crm-credit-import__run-progress': {
            width: '100%',
            maxWidth: 260
          },
          '.MuiStack-root.crm-credit-import__download-actions, .MuiStack-root.crm-credit-import__navigation': {
            alignItems: 'center',
            flexWrap: 'wrap'
          },
          '.MuiPaper-root.crm-credit-import__empty-notice': {
            padding: theme.spacing(2.2),
            textAlign: 'center'
          },
          '.MuiBox-root.crm-dynamic-grid__item': {
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(0.9),
            height: '100%'
          },

          '.crm-dynamic-grid .react-grid-item.react-grid-placeholder': {
            borderRadius: 15,
            border: `1px dashed ${alpha(theme.palette.primary.main, isLight ? 0.28 : 0.4)}`,
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.08 : 0.16),
            boxShadow: `inset 0 0 0 1px ${alpha(theme.palette.primary.main, isLight ? 0.12 : 0.22)}`
          },
          '.MuiStack-root.crm-dynamic-grid__drag-handle': {
            border: `1px solid ${alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14)}`,
            borderRadius: 12,
            padding: theme.spacing(0.5, 1),
            backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.92 : 0.84),
            color: theme.palette.text.secondary,
            cursor: 'grab',
            userSelect: 'none',
            '&:active': {
              cursor: 'grabbing'
            }
          },

          '@media (prefers-reduced-motion: reduce)': {
            '*, *::before, *::after': {
              animationDuration: '1ms !important',
              transitionDuration: '1ms !important',
              scrollBehavior: 'auto !important'
            }
          }
        };
      }
    },

    MuiPaper: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundImage: 'none',
          boxShadow: (getVisualTokens(theme).shadow || {}).xs || theme.shadows[1],
          position: 'relative'
        }),
        outlined: ({ theme }) => ({
          ...getCardSurface(theme, { soft: true }),
          padding: theme.spacing(1.5)
        })
      },
      variants: [
        {
          props: { variant: 'page' },
          style: ({ theme }) => ({
            ...getCardSurface(theme, { soft: true }),
            ...getHoverLift(theme),
            padding: theme.spacing(cardPadding + 0.1),
            backgroundImage: gradients.cardSurfaceSoft
          })
        },
        {
          props: { variant: 'auth' },
          style: ({ theme }) => ({
            ...getCardSurface(theme),
            ...getHoverLift(theme),
            padding: theme.spacing(cardPadding + 0.15),
            [theme.breakpoints.down('sm')]: {
              padding: theme.spacing(2.2)
            }
          })
        },
        {
          props: { variant: 'panel' },
          style: ({ theme }) => ({
            ...getCardSurface(theme, { soft: true }),
            ...getHoverLift(theme),
            padding: theme.spacing(cardPadding - 0.15)
          })
        },
        {
          props: { variant: 'panel-sm' },
          style: ({ theme }) => ({
            ...getCardSurface(theme, { soft: true }),
            ...getHoverLift(theme),
            padding: theme.spacing(cardPadding - 0.55)
          })
        },
        {
          props: { variant: 'filter' },
          style: ({ theme }) => ({
            ...getCardSurface(theme, { soft: true }),
            ...getHoverLift(theme),
            padding: theme.spacing(1.65, cardPadding),
            backgroundImage: gradients.cardSurfaceSoft
          })
        },
        {
          props: { variant: 'summary' },
          style: ({ theme }) => ({
            ...getCardSurface(theme, { soft: true }),
            ...getHoverLift(theme),
            padding: theme.spacing(cardPadding - 0.45),
            flex: 1,
            minWidth: 0
          })
        },
        {
          props: { variant: 'table' },
          style: ({ theme }) => ({
            ...getTableSurface(theme),
            overflow: 'hidden',
            padding: 0,
            display: 'flex',
            flexDirection: 'column'
          })
        }
      ]
    },

    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          ...getCardSurface(theme, { soft: true }),
          ...getHoverLift(theme),
          overflow: 'hidden',
          '&.MuiCard-outlined': {
            ...getCardSurface(theme, { soft: true })
          }
        })
      }
    },

    MuiCardHeader: {
      styleOverrides: {
        root: ({ theme }) => ({
          padding: theme.spacing(cardPadding, cardPadding, 1.2),
          position: 'relative',
          zIndex: 1,
          borderBottom: `1px solid ${alpha(theme.palette.divider, isLight ? 0.56 : 0.44)}`
        }),
        title: ({ theme }) => ({
          fontWeight: 650,
          fontSize: theme.typography.h6.fontSize,
          letterSpacing: '-0.012em'
        }),
        subheader: ({ theme }) => ({
          marginTop: theme.spacing(0.45),
          fontWeight: 500,
          color: theme.palette.text.secondary
        }),
        action: ({ theme }) => ({
          alignSelf: 'center',
          marginTop: 0,
          marginRight: 0
        })
      }
    },

    MuiCardContent: {
      styleOverrides: {
        root: ({ theme }) => ({
          padding: theme.spacing(cardPadding),
          position: 'relative',
          zIndex: 1,
          '&:last-child': {
            paddingBottom: theme.spacing(cardPadding)
          }
        })
      }
    },

    MuiButton: {
      defaultProps: {
        disableElevation: true,
        size: 'medium'
      },
      styleOverrides: {
        root: ({ theme }) => ({
          position: 'relative',
          overflow: 'hidden',
          isolation: 'isolate',
          borderRadius: (getVisualTokens(theme).component || {}).button?.radius || 14,
          minHeight: (getVisualTokens(theme).component || {}).button?.minHeight || 42,
          padding: theme.spacing(1.05, 2.15),
          fontWeight: 610,
          fontSize: theme.typography.button.fontSize,
          lineHeight: 1.2,
          letterSpacing: '0.012em',
          textTransform: 'none',
          border: `1px solid ${(getVisualTokens(theme).border || {}).soft || alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14)}`,
          boxShadow: (getVisualTokens(theme).shadow || {}).xs || 'none',
          transition: theme.transitions.create(
            ['transform', 'box-shadow', 'background-color', 'border-color', 'color'],
            { duration: motionTokens.microDurationMs, easing: motionTokens.microEasing }
          ),
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            opacity: 0,
            background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, isLight ? 0.22 : 0.08)} 0%, transparent 58%)`,
            transition: `opacity ${microMotion}`
          },
          '& .MuiButton-startIcon, & .MuiButton-endIcon': {
            transition: `transform ${microMotion}, opacity ${microMotion}`
          },
          '&.Mui-focusVisible': {
            boxShadow: (getVisualTokens(theme).shadow || {}).focus || `0 0 0 3px ${alpha(theme.palette.primary.main, isLight ? 0.22 : 0.32)}`
          },
          '&:not(.Mui-disabled):hover': {
            transform: 'translateY(-1px)',
            '&::after': {
              opacity: 1
            },
            '& .MuiButton-startIcon': {
              transform: 'translateX(-1px)'
            },
            '& .MuiButton-endIcon': {
              transform: 'translateX(1px)'
            }
          },
          '&:not(.Mui-disabled):active': {
            transform: 'translateY(0) scale(0.985)',
            '&::after': {
              opacity: 0.72
            }
          },
          '&.Mui-disabled': {
            color: (getVisualTokens(theme).state || {}).disabledText || alpha(theme.palette.text.primary, 0.42),
            borderColor: alpha(theme.palette.divider, 0.5),
            backgroundColor: (getVisualTokens(theme).state || {}).disabledBg || alpha(theme.palette.text.primary, isLight ? 0.06 : 0.12),
            boxShadow: 'none'
          }
        }),
        sizeSmall: ({ theme }) => ({
          minHeight: 34,
          borderRadius: 11,
          padding: theme.spacing(0.62, 1.4),
          fontSize: theme.typography.caption.fontSize
        }),
        sizeLarge: ({ theme }) => ({
          minHeight: (getVisualTokens(theme).component || {}).button?.minHeightLg || 50,
          borderRadius: 16,
          padding: theme.spacing(1.25, 2.85),
          fontSize: theme.typography.body1.fontSize
        }),
        contained: ({ theme }) => ({
          color: theme.palette.primary.contrastText,
          backgroundImage: gradients.buttonPrimary,
          backgroundColor: theme.palette.primary.main,
          borderColor: (getVisualTokens(theme).border || {}).accent || alpha(theme.palette.primary.main, isLight ? 0.36 : 0.46),
          boxShadow: (getVisualTokens(theme).shadow || {}).glow || `0 10px 20px ${alpha(theme.palette.primary.main, isLight ? 0.18 : 0.26)}`,
          '&:hover': {
            backgroundImage: gradients.buttonPrimary,
            borderColor: alpha(theme.palette.primary.main, isLight ? 0.46 : 0.56),
            boxShadow: (getVisualTokens(theme).shadow || {}).lg || `0 12px 24px ${alpha(theme.palette.primary.main, isLight ? 0.22 : 0.3)}`
          }
        }),
        outlined: ({ theme }) => ({
          color: theme.palette.text.primary,
          borderColor: (getVisualTokens(theme).border || {}).soft || alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14),
          backgroundColor: (getVisualTokens(theme).surface || {}).floating || alpha(theme.palette.background.paper, isLight ? 0.92 : 0.82),
          backdropFilter: `blur(${(getVisualTokens(theme).blur || {}).xs || 6}px) saturate(${(getVisualTokens(theme).surface || {}).saturate || 140}%)`,
          WebkitBackdropFilter: `blur(${(getVisualTokens(theme).blur || {}).xs || 6}px) saturate(${(getVisualTokens(theme).surface || {}).saturate || 140}%)`,
          boxShadow: (getVisualTokens(theme).shadow || {}).xs || `0 6px 12px ${alpha(theme.palette.text.primary, isLight ? 0.04 : 0.1)}`,
          '&:hover': {
            borderColor: alpha(theme.palette.primary.main, isLight ? 0.24 : 0.36),
            backgroundColor: (getVisualTokens(theme).state || {}).hover || alpha(theme.palette.primary.main, isLight ? 0.06 : 0.14)
          }
        }),
        text: ({ theme }) => ({
          color: alpha(theme.palette.text.secondary, 0.96),
          borderColor: 'transparent',
          backgroundColor: 'transparent',
          boxShadow: 'none',
          '&:hover': {
            color: theme.palette.text.primary,
            backgroundColor: (getVisualTokens(theme).state || {}).hover || alpha(theme.palette.primary.main, isLight ? 0.06 : 0.14)
          }
        }),
        containedError: ({ theme }) => ({
          color: theme.palette.error.contrastText,
          backgroundImage: `linear-gradient(135deg, ${alpha(theme.palette.error.main, isLight ? 0.96 : 0.92)} 0%, ${alpha(theme.palette.error.dark || theme.palette.error.main, isLight ? 0.92 : 0.84)} 100%)`,
          borderColor: alpha(theme.palette.error.main, isLight ? 0.34 : 0.44),
          boxShadow: `0 10px 20px ${alpha(theme.palette.error.main, isLight ? 0.16 : 0.24)}`,
          '&:hover': {
            borderColor: alpha(theme.palette.error.main, isLight ? 0.44 : 0.54),
            boxShadow: `0 12px 24px ${alpha(theme.palette.error.main, isLight ? 0.2 : 0.28)}`
          }
        }),
        outlinedError: ({ theme }) => ({
          color: theme.palette.error.main,
          borderColor: alpha(theme.palette.error.main, isLight ? 0.22 : 0.34),
          backgroundColor: alpha(theme.palette.error.main, isLight ? 0.06 : 0.12),
          '&:hover': {
            borderColor: alpha(theme.palette.error.main, isLight ? 0.32 : 0.44),
            backgroundColor: alpha(theme.palette.error.main, isLight ? 0.1 : 0.18)
          }
        }),
        textError: ({ theme }) => ({
          color: theme.palette.error.main,
          '&:hover': {
            backgroundColor: alpha(theme.palette.error.main, isLight ? 0.08 : 0.14)
          }
        }),
        containedSecondary: ({ theme }) => ({
          color: theme.palette.text.primary,
          backgroundImage: 'none',
          backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.94 : 0.84),
          borderColor: alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14),
          boxShadow: `0 8px 16px ${alpha(theme.palette.text.primary, isLight ? 0.05 : 0.12)}`,
          '&:hover': {
            backgroundColor: alpha(theme.palette.background.paper, isLight ? 1 : 0.9),
            borderColor: alpha(theme.palette.primary.main, isLight ? 0.24 : 0.34),
            boxShadow: `0 10px 18px ${alpha(theme.palette.text.primary, isLight ? 0.06 : 0.14)}`
          }
        }),
        outlinedSecondary: ({ theme }) => ({
          color: theme.palette.text.secondary,
          borderColor: alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14),
          backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.9 : 0.8),
          '&:hover': {
            color: theme.palette.text.primary,
            borderColor: alpha(theme.palette.primary.main, isLight ? 0.24 : 0.34),
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.06 : 0.14)
          }
        })
      },
      variants: [
        {
          props: { variant: 'ghost' },
          style: ({ theme }) => ({
            color: alpha(theme.palette.text.secondary, 0.96),
            border: `1px solid ${alpha(theme.palette.text.primary, isLight ? 0.05 : 0.1)}`,
            backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.42 : 0.24),
            boxShadow: 'none',
            '&:hover': {
              color: theme.palette.text.primary,
              borderColor: alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14),
              backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.08 : 0.16)
            }
          })
        }
      ]
    },

    MuiIconButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          width: 38,
          height: 38,
          borderRadius: 12,
          backgroundColor: (getVisualTokens(theme).surface || {}).floating || alpha(theme.palette.background.paper, isLight ? 0.9 : 0.82),
          border: `1px solid ${(getVisualTokens(theme).border || {}).soft || alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14)}`,
          boxShadow: (getVisualTokens(theme).shadow || {}).xs || `0 6px 14px ${alpha(theme.palette.text.primary, isLight ? 0.05 : 0.12)}`,
          transition: `transform ${microMotion}, box-shadow ${microMotion}, background-color ${microMotion}, border-color ${microMotion}, color ${microMotion}`,
          '&.Mui-focusVisible': {
            boxShadow: (getVisualTokens(theme).shadow || {}).focus || `0 0 0 3px ${alpha(theme.palette.primary.main, isLight ? 0.2 : 0.28)}`
          },
          '&:not(.Mui-disabled):hover': {
            backgroundColor: (getVisualTokens(theme).state || {}).hover || alpha(theme.palette.primary.main, isLight ? 0.08 : 0.16),
            boxShadow: (getVisualTokens(theme).shadow || {}).sm || `0 8px 16px ${alpha(theme.palette.text.primary, isLight ? 0.06 : 0.14)}`,
            transform: 'translateY(-1px)'
          },
          '&:not(.Mui-disabled):active': {
            transform: 'translateY(0) scale(0.99)'
          },
          '&.Mui-disabled': {
            backgroundColor: (getVisualTokens(theme).state || {}).disabledBg || alpha(theme.palette.text.primary, isLight ? 0.06 : 0.1),
            borderColor: alpha(theme.palette.divider, 0.6),
            boxShadow: 'none'
          }
        }),
        sizeSmall: {
          width: 32,
          height: 32,
          borderRadius: 10
        },
        colorError: ({ theme }) => ({
          color: theme.palette.error.main,
          borderColor: alpha(theme.palette.error.main, isLight ? 0.18 : 0.28),
          backgroundColor: alpha(theme.palette.error.main, isLight ? 0.06 : 0.12),
          '&:hover': {
            borderColor: alpha(theme.palette.error.main, isLight ? 0.28 : 0.4),
            backgroundColor: alpha(theme.palette.error.main, isLight ? 0.1 : 0.18)
          }
        }),
        colorSuccess: ({ theme }) => ({
          color: theme.palette.success.main,
          borderColor: alpha(theme.palette.success.main, isLight ? 0.18 : 0.28),
          backgroundColor: alpha(theme.palette.success.main, isLight ? 0.06 : 0.12)
        }),
        colorWarning: ({ theme }) => ({
          color: theme.palette.warning.main,
          borderColor: alpha(theme.palette.warning.main, isLight ? 0.18 : 0.28),
          backgroundColor: alpha(theme.palette.warning.main, isLight ? 0.08 : 0.14)
        })
      }
    },

    MuiTextField: {
      defaultProps: {
        size: 'medium',
        variant: 'outlined'
      },
      styleOverrides: {
        root: ({ theme }) => ({
          width: '100%',
          '& .MuiFormHelperText-root': {
            marginTop: theme.spacing(0.75)
          }
        })
      }
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: (getVisualTokens(theme).component || {}).input?.radius || 14,
          minHeight: (getVisualTokens(theme).component || {}).input?.minHeight || 46,
          backgroundColor: (getVisualTokens(theme).surface || {}).input || alpha(theme.palette.background.paper, isLight ? 0.98 : 0.9),
          backdropFilter: `blur(${(getVisualTokens(theme).blur || {}).xs || 6}px) saturate(${(getVisualTokens(theme).surface || {}).saturate || 140}%)`,
          WebkitBackdropFilter: `blur(${(getVisualTokens(theme).blur || {}).xs || 6}px) saturate(${(getVisualTokens(theme).surface || {}).saturate || 140}%)`,
          boxShadow: (getVisualTokens(theme).shadow || {}).xs || `0 2px 6px ${alpha(theme.palette.text.primary, isLight ? 0.03 : 0.1)}`,
          transition: theme.transitions.create(
            ['box-shadow', 'border-color', 'background-color', 'transform'],
            { duration: motionTokens.microDurationMs, easing: motionTokens.microEasing }
          ),
          '& .MuiOutlinedInput-input': {
            padding: theme.spacing(1.25, 1.5),
            fontWeight: 500
          },
          '& .MuiOutlinedInput-input.MuiInputBase-inputSizeSmall': {
            padding: theme.spacing(1, 1.2)
          },
          '& input[type="date"], & input[type="time"], & input[type="datetime-local"]': {
            fontVariantNumeric: 'tabular-nums',
            minHeight: 22
          },
          '&.MuiInputBase-multiline': {
            minHeight: 0,
            padding: theme.spacing(0.3)
          },
          '&.MuiInputBase-multiline .MuiOutlinedInput-input': {
            padding: theme.spacing(0.95, 1.1),
            lineHeight: 1.6
          },
          '& .MuiSelect-select': {
            display: 'flex',
            alignItems: 'center',
            minHeight: '1.4em'
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: (getVisualTokens(theme).border || {}).standard || alpha(theme.palette.text.primary, isLight ? 0.1 : 0.16),
            borderWidth: 1
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(theme.palette.primary.main, isLight ? 0.26 : 0.38)
          },
          '&.Mui-focused': {
            backgroundColor: (getVisualTokens(theme).surface || {}).inputRaised || alpha(theme.palette.background.paper, isLight ? 1 : 0.94),
            boxShadow: (getVisualTokens(theme).shadow || {}).focus || `0 0 0 1px ${alpha(theme.palette.primary.main, isLight ? 0.28 : 0.4)}, 0 0 0 4px ${alpha(theme.palette.primary.main, isLight ? 0.12 : 0.2)}, 0 10px 18px ${alpha(theme.palette.primary.main, isLight ? 0.08 : 0.16)}`,
            transform: 'translateY(-1px)'
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(theme.palette.primary.main, isLight ? 0.4 : 0.52),
            borderWidth: 1
          },
          '&.Mui-error': {
            boxShadow: `0 0 0 1px ${alpha(theme.palette.error.main, isLight ? 0.24 : 0.34)}, 0 0 0 4px ${alpha(theme.palette.error.main, isLight ? 0.08 : 0.14)}`
          },
          '&.Mui-error .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.error.main
          },
          '&.Mui-disabled': {
            backgroundColor: alpha(theme.palette.text.primary, isLight ? 0.04 : 0.1),
            boxShadow: 'none'
          }
        })
      }
    },

    MuiInputBase: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.text.primary,
          fontSize: '0.92rem',
          lineHeight: 1.45
        }),
        input: ({ theme }) => ({
          '&::placeholder': {
            color: alpha(theme.palette.text.secondary, 0.64),
            fontWeight: 480,
            letterSpacing: '0.01em',
            opacity: 1
          }
        }),
        inputMultiline: ({ theme }) => ({
          lineHeight: 1.6,
          '&::placeholder': {
            color: alpha(theme.palette.text.secondary, 0.72),
            fontWeight: 470,
            letterSpacing: '0.01em',
            opacity: 1
          }
        })
      }
    },

    MuiFormControl: {
      styleOverrides: {
        root: ({ theme }) => ({
          '& .MuiInputBase-root': {
            borderRadius: 14
          },
          '& .MuiFormHelperText-root': {
            minHeight: theme.spacing(2.1)
          }
        })
      }
    },

    MuiInputLabel: {
      styleOverrides: {
        root: ({ theme }) => ({
          fontWeight: 600,
          fontSize: '0.76rem',
          lineHeight: 1.2,
          letterSpacing: '0.03em',
          textTransform: 'none',
          color: alpha(theme.palette.text.secondary, 0.9),
          '&.Mui-focused': {
            color: theme.palette.primary.main
          },
          '&.Mui-error': {
            color: theme.palette.error.main
          }
        }),
        shrink: {
          transform: 'translate(14px, -8px) scale(0.85)'
        }
      }
    },

    MuiFormHelperText: {
      styleOverrides: {
        root: ({ theme }) => ({
          marginTop: theme.spacing(0.7),
          marginLeft: theme.spacing(0.25),
          marginRight: theme.spacing(0.25),
          fontSize: '0.72rem',
          letterSpacing: '0.01em',
          lineHeight: 1.45,
          color: alpha(theme.palette.text.secondary, 0.9)
        }),
        error: ({ theme }) => ({
          color: theme.palette.error.main,
          fontWeight: 560
        }),
        contained: {
          marginLeft: 2,
          marginRight: 2
        }
      }
    },

    MuiFormControlLabel: {
      styleOverrides: {
        root: ({ theme }) => ({
          marginLeft: 0,
          marginRight: 0,
          gap: theme.spacing(1),
          alignItems: 'flex-start',
          '& .MuiFormControlLabel-label': {
            fontSize: theme.typography.body2.fontSize,
            lineHeight: 1.5,
            fontWeight: 520,
            color: theme.palette.text.primary
          }
        }),
        labelPlacementStart: ({ theme }) => ({
          justifyContent: 'space-between',
          width: '100%',
          '& .MuiFormControlLabel-label': {
            marginRight: theme.spacing(1)
          }
        })
      }
    },

    MuiSwitch: {
      styleOverrides: {
        root: ({ theme }) => ({
          width: 44,
          height: 28,
          padding: 0,
          '& .MuiSwitch-switchBase': {
            padding: 2,
            transitionDuration: `${motionTokens.microDurationMs}ms`,
            '&.Mui-checked': {
              transform: 'translateX(16px)',
              color: theme.palette.common.white,
              '& + .MuiSwitch-track': {
                backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.88 : 0.76),
                borderColor: alpha(theme.palette.primary.main, isLight ? 0.62 : 0.56),
                opacity: 1
              }
            }
          },
          '& .MuiSwitch-thumb': {
            boxSizing: 'border-box',
            width: 24,
            height: 24,
            boxShadow: `0 4px 10px ${alpha(theme.palette.text.primary, isLight ? 0.14 : 0.28)}`
          },
          '& .MuiSwitch-track': {
            borderRadius: 999,
            backgroundColor: alpha(theme.palette.text.secondary, isLight ? 0.24 : 0.36),
            border: `1px solid ${alpha(theme.palette.text.primary, isLight ? 0.08 : 0.16)}`,
            opacity: 1
          }
        })
      }
    },

    MuiCheckbox: {
      styleOverrides: {
        root: ({ theme }) => ({
          padding: theme.spacing(0.4),
          color: alpha(theme.palette.text.secondary, 0.86),
          '& .MuiSvgIcon-root': {
            fontSize: '1.15rem',
            borderRadius: 6
          },
          '&.Mui-checked': {
            color: theme.palette.primary.main
          },
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.06 : 0.12)
          }
        })
      }
    },

    MuiInputAdornment: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: alpha(theme.palette.text.secondary, 0.82)
        })
      }
    },

    MuiSelect: {
      styleOverrides: {
        icon: ({ theme }) => ({
          color: alpha(theme.palette.text.secondary, 0.92)
        }),
        select: ({ theme }) => ({
          minHeight: '1.4em',
          display: 'flex',
          alignItems: 'center',
          '&:focus': {
            borderRadius: 14
          }
        })
      }
    },

    MuiAutocomplete: {
      styleOverrides: {
        paper: ({ theme }) => ({
          ...buildGlassSurface(theme, {
            radius: 14,
            borderAlpha: isLight ? 0.08 : 0.14,
            backgroundAlpha: isLight ? 0.98 : 0.94,
            blur: 8,
            shadowAlpha: isLight ? 0.08 : 0.16
          }),
          marginTop: theme.spacing(0.8)
        }),
        root: ({ theme }) => ({
          '& .MuiOutlinedInput-root': {
            paddingTop: 0,
            paddingBottom: 0
          }
        }),
        option: ({ theme }) => ({
          minHeight: 40,
          paddingTop: theme.spacing(0.9),
          paddingBottom: theme.spacing(0.9),
          fontSize: '0.88rem',
          '&[aria-selected="true"]': {
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.08 : 0.16)
          },
          '&.Mui-focused': {
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.06 : 0.14)
          }
        })
      }
    },
    MuiBackdrop: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: (getVisualTokens(theme).overlay || {}).scrim || alpha(theme.palette.background.default, isLight ? 0.18 : 0.5),
          backdropFilter: `blur(${(getVisualTokens(theme).blur || {}).sm || 10}px) saturate(116%)`,
          WebkitBackdropFilter: `blur(${(getVisualTokens(theme).blur || {}).sm || 10}px) saturate(116%)`
        })
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: ({ theme }) => ({
          border: 0,
          backgroundImage: gradients.sidebarBackground,
          backgroundColor: (getVisualTokens(theme).surface || {}).sidebar || alpha(theme.palette.background.paper, isLight ? 0.96 : 0.9),
          backdropFilter: `blur(${(getVisualTokens(theme).blur || {}).md || 14}px) saturate(${(getVisualTokens(theme).surface || {}).saturate || 140}%)`,
          WebkitBackdropFilter: `blur(${(getVisualTokens(theme).blur || {}).md || 14}px) saturate(${(getVisualTokens(theme).surface || {}).saturate || 140}%)`
        })
      }
    },
    MuiMenu: {
      defaultProps: {
        elevation: 0
      },
      styleOverrides: {
        paper: ({ theme }) => ({
          ...buildGlassSurface(theme, {
            radius: 16,
            borderAlpha: isLight ? 0.08 : 0.14,
            backgroundAlpha: isLight ? 0.98 : 0.94,
            blur: 10,
            shadowAlpha: isLight ? 0.08 : 0.18,
            backgroundColor: (getVisualTokens(theme).surface || {}).floating
          }),
          minWidth: 220,
          marginTop: theme.spacing(0.8),
          overflow: 'hidden'
        }),
        list: ({ theme }) => ({
          padding: theme.spacing(0.75)
        })
      }
    },
    MuiMenuItem: {
      styleOverrides: {
        root: ({ theme }) => ({
          minHeight: 42,
          margin: theme.spacing(0.25, 0),
          padding: theme.spacing(1, 1.15),
          borderRadius: 12,
          fontSize: theme.typography.body2.fontSize,
          fontWeight: 540,
          color: theme.palette.text.primary,
          transition: theme.transitions.create(
            ['background-color', 'border-color', 'transform', 'color'],
            { duration: motionTokens.microDurationMs, easing: motionTokens.microEasing }
          ),
          '& .MuiListItemIcon-root': {
            minWidth: 32,
            color: alpha(theme.palette.text.secondary, 0.9)
          },
          '& .MuiListItemText-secondary': {
            color: alpha(theme.palette.text.secondary, 0.9)
          },
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.08 : 0.16),
            transform: 'translateX(1px)'
          },
          '&.Mui-selected': {
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.12 : 0.2),
            color: theme.palette.text.primary
          },
          '&.Mui-selected:hover': {
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.14 : 0.24)
          }
        })
      }
    },
    MuiDialog: {
      defaultProps: {
        transitionDuration: {
          enter: motionTokens.entranceDurationMs,
          exit: motionTokens.standardDurationMs
        }
      },
      styleOverrides: {
        root: ({ theme }) => ({
          '& .MuiBackdrop-root': {
            backgroundColor: (getVisualTokens(theme).overlay || {}).modal || alpha(theme.palette.background.default, isLight ? 0.34 : 0.56),
            backdropFilter: `blur(${(getVisualTokens(theme).blur || {}).sm || 10}px) saturate(118%)`,
            WebkitBackdropFilter: `blur(${(getVisualTokens(theme).blur || {}).sm || 10}px) saturate(118%)`
          },
          '& .MuiDialog-container': {
            padding: theme.spacing(1.4),
            [theme.breakpoints.up('sm')]: {
              padding: theme.spacing(2.2)
            }
          }
        }),
        paper: ({ theme }) => ({
          ...buildGlassSurface(theme, {
            radius: (getVisualTokens(theme).component || {}).dialog?.radius || 24,
            borderAlpha: isLight ? 0.08 : 0.14,
            backgroundAlpha: isLight ? 0.98 : 0.94,
            blur: (getVisualTokens(theme).blur || {}).md || 14,
            shadowAlpha: isLight ? 0.1 : 0.2,
            backgroundColor: (getVisualTokens(theme).surface || {}).dialog
          }),
          position: 'relative',
          overflow: 'hidden',
          margin: 0,
          backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, isLight ? 1 : 0.96)} 0%, ${alpha(theme.palette.background.default, isLight ? 0.94 : 0.9)} 100%)`,
          boxShadow: (getVisualTokens(theme).shadow || {}).xl || `0 18px 36px ${alpha(theme.palette.text.primary, isLight ? 0.12 : 0.24)}`,
          animation: 'crm-modal-enter 300ms ease-out',
          transformOrigin: 'center',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, isLight ? 0.16 : 0.04)} 0%, transparent 32%)`
          }
        })
      }
    },

    MuiDialogTitle: {
      styleOverrides: {
        root: ({ theme }) => ({
          padding: theme.spacing(1.75, 2.4, 1),
          fontWeight: 630,
          letterSpacing: '-0.01em',
          borderBottom: `1px solid ${alpha(theme.palette.divider, isLight ? 0.84 : 0.66)}`
        })
      }
    },

    MuiDialogContent: {
      styleOverrides: {
        root: ({ theme }) => ({
          padding: theme.spacing(1.75, 2.4),
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing(1.35),
          '&.MuiDialogContent-dividers': {
            borderTop: 0,
            borderBottom: 0
          }
        })
      }
    },

    MuiDialogActions: {
      styleOverrides: {
        root: ({ theme }) => ({
          padding: theme.spacing(1.05, 2.4, 1.55),
          justifyContent: 'flex-end',
          gap: theme.spacing(0.85),
          borderTop: `1px solid ${alpha(theme.palette.divider, isLight ? 0.82 : 0.64)}`,
          backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0)} 0%, ${alpha(theme.palette.background.default, isLight ? 0.18 : 0.28)} 100%)`,
          '& .MuiButton-root': {
            minWidth: 108,
            borderRadius: 12
          },
          '& .MuiButton-root:first-of-type:not(:only-of-type)': {
            color: alpha(theme.palette.text.secondary, 0.96),
            borderColor: alpha(theme.palette.divider, isLight ? 0.84 : 0.7),
            backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.76 : 0.52),
            boxShadow: 'none'
          },
          '& .MuiButton-root:last-of-type': {
            color: theme.palette.primary.contrastText,
            borderColor: alpha(theme.palette.primary.main, isLight ? 0.54 : 0.68),
            backgroundImage: gradients.buttonPrimary,
            backgroundColor: theme.palette.primary.main,
            boxShadow: `0 10px 24px ${alpha(theme.palette.primary.main, isLight ? 0.3 : 0.44)}`
          }
        })
      }
    },

    MuiSnackbar: {
      defaultProps: {
        anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
        autoHideDuration: 5000
      }
    },

    MuiSnackbarContent: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 15,
          boxShadow: (getVisualTokens(theme).shadow || {}).lg || theme.shadows[8],
          fontSize: theme.typography.body2.fontSize,
          fontWeight: 560,
          backgroundColor: (getVisualTokens(theme).surface || {}).floating || alpha(theme.palette.background.paper, isLight ? 0.98 : 0.92),
          border: `1px solid ${(getVisualTokens(theme).border || {}).soft || alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14)}`
        })
      }
    },

    MuiAlert: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 15,
          fontSize: theme.typography.body2.fontSize,
          fontWeight: 560,
          backdropFilter: `blur(${(getVisualTokens(theme).blur || {}).xs || 6}px)`,
          border: `1px solid ${(getVisualTokens(theme).border || {}).soft || alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14)}`,
          boxShadow: (getVisualTokens(theme).shadow || {}).xs || 'none'
        })
      }
    },
    MuiTable: {
      defaultProps: {
        size: 'medium'
      },
      styleOverrides: {
        root: ({ theme }) => ({
          width: '100%',
          borderCollapse: 'separate',
          borderSpacing: 0,
          tableLayout: 'auto',
          '&.crm-table': {
            minWidth: 760,
            [theme.breakpoints.down('sm')]: {
              minWidth: 640
            }
          },
          '&.crm-table--dense .MuiTableCell-root': {
            paddingTop: theme.spacing(1.2),
            paddingBottom: theme.spacing(1.2)
          },
          '& .MuiTableHead-root .MuiTableRow-root': {
            height: 48
          }
        })
      }
    },

    MuiTableContainer: {
      styleOverrides: {
        root: ({ theme }) => ({
          width: '100%',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarGutter: 'stable both-edges',
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorX: 'contain',
          '&.crm-table-container': {
            borderRadius: 18
          },
          '&::-webkit-scrollbar': {
            width: 10,
            height: 10
          },
          '&::-webkit-scrollbar-thumb': {
            borderRadius: 999,
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.16 : 0.26)
          },
          '&::-webkit-scrollbar-track': {
            borderRadius: 999,
            backgroundColor: alpha(theme.palette.background.default, isLight ? 0.32 : 0.44)
          }
        })
      }
    },

    MuiTableHead: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: (getVisualTokens(theme).surface || {}).tableHead || alpha(theme.palette.background.paper, isLight ? 0.96 : 0.9),
          '& .MuiTableCell-root': {
            borderBottom: `1px solid ${(getVisualTokens(theme).border || {}).soft || alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14)}`
          },
          '& .MuiTableRow-root': {
            boxShadow: `inset 0 -1px 0 ${alpha(theme.palette.text.primary, isLight ? 0.04 : 0.08)}`
          }
        })
      }
    },

    MuiTableCell: {
      styleOverrides: {
        head: ({ theme }) => ({
          fontWeight: 640,
          color: alpha(theme.palette.text.secondary, 0.96),
          fontSize: '0.72rem',
          lineHeight: 1.35,
          letterSpacing: '0.09em',
          textTransform: 'uppercase',
          paddingTop: theme.spacing(1.15),
          paddingBottom: theme.spacing(1.15),
          backgroundColor: (getVisualTokens(theme).surface || {}).tableHead || alpha(theme.palette.background.paper, isLight ? 0.96 : 0.9),
          backdropFilter: `blur(${(getVisualTokens(theme).blur || {}).xs || 6}px) saturate(120%)`,
          WebkitBackdropFilter: `blur(${(getVisualTokens(theme).blur || {}).xs || 6}px) saturate(120%)`,
          '&.MuiTableCell-stickyHeader': {
            backgroundColor: (getVisualTokens(theme).surface || {}).tableHead || alpha(theme.palette.background.paper, isLight ? 0.98 : 0.94)
          }
        }),
        body: ({ theme }) => ({
          fontSize: '0.89rem',
          lineHeight: 1.52,
          color: theme.palette.text.primary,
          fontWeight: 500
        }),
        root: ({ theme }) => ({
          padding: theme.spacing(1.3, 1.75),
          verticalAlign: 'top',
          borderBottom: `1px solid ${alpha(theme.palette.text.primary, isLight ? 0.07 : 0.12)}`,
          transition: theme.transitions.create(['border-color', 'background-color', 'box-shadow'], {
            duration: microMotionMs
          }),
          '&.MuiTableCell-sizeSmall': {
            padding: theme.spacing(0.95, 1.35)
          },
          '& .MuiTypography-root': {
            maxWidth: '100%'
          },
          '&.crm-table__cell--numeric': {
            fontVariantNumeric: 'tabular-nums'
          },
          '&.crm-table__cell--actions': {
            width: '1%',
            whiteSpace: 'nowrap',
            paddingRight: theme.spacing(1.65)
          },
          '& .MuiBox-root.crm-table__cell-content': {
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(0.35),
            minWidth: 0
          },
          '& .MuiTypography-root.crm-table__cell-value': {
            fontWeight: 520,
            lineHeight: 1.48,
            color: theme.palette.text.primary
          },
          '&.crm-table__cell--actions .MuiStack-root': {
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: theme.spacing(0.45),
            flexWrap: 'nowrap'
          },
          '&.crm-table__cell--actions .MuiIconButton-root': {
            width: 30,
            height: 30,
            padding: 0,
            borderRadius: 9,
            border: `1px solid ${alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14)}`,
            backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.92 : 0.84),
            boxShadow: `0 4px 10px ${alpha(theme.palette.text.primary, isLight ? 0.04 : 0.12)}`,
            backdropFilter: `blur(${(getVisualTokens(theme).blur || {}).xs || 6}px)`,
            WebkitBackdropFilter: `blur(${(getVisualTokens(theme).blur || {}).xs || 6}px)`,
            transition: theme.transitions.create(
              ['background-color', 'border-color', 'transform', 'box-shadow'],
              { duration: microMotionMs }
            ),
            '& .MuiSvgIcon-root, & .crm-icon': {
              width: 16,
              height: 16,
              fontSize: '1rem'
            }
          },
          '&.crm-table__cell--actions .MuiIconButton-root:hover': {
            borderColor: alpha(theme.palette.primary.main, isLight ? 0.24 : 0.36),
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.08 : 0.16),
            boxShadow: `0 8px 14px ${alpha(theme.palette.primary.main, isLight ? 0.08 : 0.14)}`,
            transform: 'translateY(-1px)'
          },
          '&.crm-table__cell--empty': {
            paddingTop: theme.spacing(5),
            paddingBottom: theme.spacing(5)
          }
        })
      }
    },

    MuiTableRow: {
      styleOverrides: {
        root: ({ theme }) => ({
          transition: theme.transitions.create(['background-color', 'box-shadow'], {
            duration: microMotionMs
          }),
          '&:nth-of-type(even):not(.crm-table__row--skeleton):not(.crm-table__row--empty)': {
            backgroundColor: alpha(theme.palette.text.primary, isLight ? 0.015 : 0.03)
          },
          '&.MuiTableRow-hover:hover': {
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.045 : 0.12),
            boxShadow: `inset 0 1px 0 ${alpha(theme.palette.primary.main, isLight ? 0.08 : 0.16)}, inset 0 -1px 0 ${alpha(theme.palette.primary.main, isLight ? 0.08 : 0.16)}`
          },
          '&.MuiTableRow-hover:hover .MuiTableCell-root': {
            borderBottomColor: alpha(theme.palette.primary.main, isLight ? 0.12 : 0.2)
          },
          '&.crm-table__row--skeleton:hover': {
            backgroundColor: 'transparent',
            boxShadow: 'none'
          },
          '&:last-of-type .MuiTableCell-root': {
            borderBottom: 0
          }
        })
      }
    },

    MuiTableFooter: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.98 : 0.94),
          '& .MuiTableRow-root': {
            backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.98 : 0.94)
          },
          '& .MuiTableCell-root': {
            borderTop: `1px solid ${alpha(theme.palette.primary.main, isLight ? 0.16 : 0.22)}`,
            borderBottom: 0,
            backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.98 : 0.94),
            backdropFilter: `blur(${(getVisualTokens(theme).blur || {}).xs || 6}px) saturate(118%)`,
            WebkitBackdropFilter: `blur(${(getVisualTokens(theme).blur || {}).xs || 6}px) saturate(118%)`
          }
        })
      }
    },

    MuiTableSortLabel: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: alpha(theme.palette.text.secondary, 0.94),
          fontWeight: 640,
          letterSpacing: '0.09em',
          textTransform: 'uppercase',
          '&:hover': {
            color: theme.palette.text.primary
          },
          '&.Mui-active': {
            color: theme.palette.primary.main
          }
        }),
        icon: ({ theme }) => ({
          fontSize: '1rem',
          color: `${alpha(theme.palette.primary.main, 0.74)} !important`
        })
      }
    },

    MuiTablePagination: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderTop: `1px solid ${alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14)}`,
          color: theme.palette.text.secondary,
          backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.96 : 0.92),
          backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, isLight ? 0.92 : 0.84)} 0%, ${alpha(theme.palette.background.default, isLight ? 0.4 : 0.24)} 100%)`,
          backdropFilter: `blur(${(getVisualTokens(theme).blur || {}).xs || 6}px)`,
          WebkitBackdropFilter: `blur(${(getVisualTokens(theme).blur || {}).xs || 6}px)`
        }),
        toolbar: ({ theme }) => ({
          minHeight: 52,
          paddingLeft: theme.spacing(1.6),
          paddingRight: theme.spacing(1.6),
          color: theme.palette.text.secondary,
          gap: theme.spacing(0.75)
        }),
        spacer: {
          flex: '1 1 24px'
        },
        selectLabel: ({ theme }) => ({
          marginBottom: 0,
          fontSize: '0.78rem',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: alpha(theme.palette.text.secondary, 0.9)
        }),
        displayedRows: ({ theme }) => ({
          marginBottom: 0,
          fontWeight: 560,
          color: alpha(theme.palette.text.secondary, 0.94)
        }),
        select: ({ theme }) => ({
          borderRadius: 10,
          paddingLeft: theme.spacing(1),
          paddingRight: theme.spacing(3.5),
          '&:focus': {
            borderRadius: 10
          }
        }),
        selectIcon: ({ theme }) => ({
          color: theme.palette.text.secondary
        }),
        actions: ({ theme }) => ({
          marginLeft: theme.spacing(1),
          '& .MuiIconButton-root': {
            width: 30,
            height: 30,
            borderRadius: 9,
            border: `1px solid ${alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14)}`,
            backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.92 : 0.86),
            boxShadow: `0 4px 10px ${alpha(theme.palette.text.primary, isLight ? 0.04 : 0.12)}`,
            color: theme.palette.text.primary,
            '&:hover': {
              borderColor: alpha(theme.palette.primary.main, isLight ? 0.24 : 0.34),
              backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.08 : 0.16)
            }
          }
        })
      }
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: ({ theme }) => ({
          borderRadius: 12,
          padding: theme.spacing(0.7, 1.05),
          fontSize: '0.72rem',
          fontWeight: 570,
          letterSpacing: '0.01em',
          color: theme.palette.text.primary,
          backgroundColor: (getVisualTokens(theme).surface || {}).floating || alpha(theme.palette.background.paper, isLight ? 0.98 : 0.94),
          border: `1px solid ${(getVisualTokens(theme).border || {}).soft || alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14)}`,
          boxShadow: (getVisualTokens(theme).shadow || {}).md || `0 8px 16px ${alpha(theme.palette.text.primary, isLight ? 0.06 : 0.14)}`,
          backdropFilter: `blur(${(getVisualTokens(theme).blur || {}).xs || 6}px)`,
          WebkitBackdropFilter: `blur(${(getVisualTokens(theme).blur || {}).xs || 6}px)`
        }),
        arrow: ({ theme }) => ({
          color: (getVisualTokens(theme).surface || {}).floating || alpha(theme.palette.background.paper, isLight ? 0.98 : 0.94)
        })
      }
    },

    MuiTabs: {
      defaultProps: {
        textColor: 'primary',
        indicatorColor: 'primary'
      },
      styleOverrides: {
        root: ({ theme }) => ({
          minHeight: 48,
          padding: theme.spacing(0.45),
          borderRadius: 16,
          border: `1px solid ${alpha(theme.palette.text.primary, isLight ? 0.06 : 0.12)}`,
          backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.54 : 0.34),
          boxShadow: (getVisualTokens(theme).shadow || {}).xs || 'none'
        }),
        flexContainer: ({ theme }) => ({
          gap: theme.spacing(0.4)
        }),
        indicator: {
          display: 'none'
        }
      }
    },

    MuiTab: {
      styleOverrides: {
        root: ({ theme }) => ({
          minHeight: 40,
          minWidth: 0,
          padding: theme.spacing(0.95, 1.6),
          textTransform: 'none',
          fontWeight: 600,
          fontSize: theme.typography.body2.fontSize,
          borderRadius: 12,
          color: alpha(theme.palette.text.secondary, 0.92),
          transition: theme.transitions.create(
            ['background-color', 'box-shadow', 'color', 'transform'],
            { duration: motionTokens.microDurationMs, easing: motionTokens.microEasing }
          ),
          '&:hover': {
            color: theme.palette.text.primary,
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.08 : 0.16)
          },
          '&.Mui-selected': {
            color: theme.palette.text.primary,
            backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.92 : 0.74),
            boxShadow: (getVisualTokens(theme).shadow || {}).xs || `0 8px 16px ${alpha(theme.palette.text.primary, isLight ? 0.05 : 0.14)}`
          }
        })
      }
    },

    MuiStepper: {
      styleOverrides: {
        root: ({ theme }) => ({
          padding: 0,
          backgroundColor: 'transparent'
        })
      }
    },

    MuiStep: {
      styleOverrides: {
        root: ({ theme }) => ({
          paddingLeft: theme.spacing(0.5),
          paddingRight: theme.spacing(0.5)
        })
      }
    },

    MuiStepLabel: {
      styleOverrides: {
        root: ({ theme }) => ({
          margin: 0
        }),
        labelContainer: {
          marginTop: 0
        },
        label: ({ theme }) => ({
          marginTop: theme.spacing(0.7),
          fontSize: theme.typography.caption.fontSize,
          fontWeight: 620,
          letterSpacing: '0.03em',
          color: alpha(theme.palette.text.secondary, 0.88),
          '&.Mui-active': {
            color: theme.palette.text.primary
          },
          '&.Mui-completed': {
            color: alpha(theme.palette.text.primary, 0.96)
          }
        }),
        iconContainer: ({ theme }) => ({
          paddingRight: 0
        })
      }
    },

    MuiStepIcon: {
      styleOverrides: {
        root: ({ theme }) => ({
          fontSize: '1.55rem',
          color: alpha(theme.palette.text.primary, isLight ? 0.14 : 0.22),
          '&.Mui-active': {
            color: theme.palette.primary.main
          },
          '&.Mui-completed': {
            color: theme.palette.success.main
          }
        }),
        text: ({ theme }) => ({
          fill: theme.palette.text.primary,
          fontSize: '0.74rem',
          fontWeight: 700
        })
      }
    },

    MuiStepConnector: {
      styleOverrides: {
        line: ({ theme }) => ({
          borderTopWidth: 1,
          borderColor: alpha(theme.palette.text.primary, isLight ? 0.1 : 0.16)
        })
      }
    },

    MuiListItemButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 12,
          transition: theme.transitions.create(
            ['background-color', 'transform', 'box-shadow', 'border-color'],
            { duration: motionTokens.microDurationMs, easing: motionTokens.microEasing }
          ),
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.06 : 0.14)
          },
          '&.Mui-selected': {
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.1 : 0.18),
            boxShadow: `inset 0 0 0 1px ${alpha(theme.palette.primary.main, isLight ? 0.14 : 0.22)}`
          }
        })
      }
    },

    MuiChip: {
      defaultProps: {
        size: 'small'
      },
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: (getVisualTokens(theme).component || {}).badge?.radius || 999,
          fontWeight: 620,
          fontSize: theme.typography.caption.fontSize,
          lineHeight: 1,
          borderColor: (getVisualTokens(theme).border || {}).soft || alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14),
          backgroundColor: (getVisualTokens(theme).surface || {}).badge || alpha(theme.palette.background.paper, isLight ? 0.92 : 0.84),
          boxShadow: (getVisualTokens(theme).shadow || {}).xs || 'none',
          backdropFilter: `blur(${(getVisualTokens(theme).blur || {}).xs || 6}px)`,
          WebkitBackdropFilter: `blur(${(getVisualTokens(theme).blur || {}).xs || 6}px)`,
          transition: theme.transitions.create(
            ['background-color', 'border-color', 'box-shadow', 'transform', 'color'],
            { duration: motionTokens.microDurationMs, easing: motionTokens.microEasing }
          ),
          '&.MuiChip-clickable:hover': {
            transform: 'translateY(-1px)',
            boxShadow: (getVisualTokens(theme).shadow || {}).sm || `0 8px 16px ${alpha(theme.palette.text.primary, isLight ? 0.05 : 0.14)}`
          },
          '& .MuiChip-icon': {
            marginLeft: 8,
            marginRight: -2
          },
          '& .MuiChip-deleteIcon': {
            color: alpha(theme.palette.text.secondary, 0.76),
            transition: `color ${microMotion}`,
            '&:hover': {
              color: theme.palette.text.primary
            }
          }
        }),
        sizeSmall: {
          height: 28
        },
        labelSmall: {
          paddingLeft: 10,
          paddingRight: 10
        },
        outlined: ({ theme }) => ({
          borderColor: (getVisualTokens(theme).border || {}).soft || alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14)
        }),
        colorDefault: ({ theme }) => ({
          color: alpha(theme.palette.text.secondary, 0.96)
        }),
        colorSuccess: ({ theme }) => ({
          color: theme.palette.success.main,
          borderColor: alpha(theme.palette.success.main, isLight ? 0.18 : 0.28),
          backgroundColor: alpha(theme.palette.success.main, isLight ? 0.1 : 0.18)
        }),
        colorWarning: ({ theme }) => ({
          color: theme.palette.warning.main,
          borderColor: alpha(theme.palette.warning.main, isLight ? 0.18 : 0.28),
          backgroundColor: alpha(theme.palette.warning.main, isLight ? 0.12 : 0.18)
        }),
        colorError: ({ theme }) => ({
          color: theme.palette.error.main,
          borderColor: alpha(theme.palette.error.main, isLight ? 0.18 : 0.28),
          backgroundColor: alpha(theme.palette.error.main, isLight ? 0.1 : 0.18)
        }),
        colorPrimary: ({ theme }) => ({
          color: theme.palette.primary.main,
          borderColor: alpha(theme.palette.primary.main, isLight ? 0.18 : 0.28),
          backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.1 : 0.18)
        })
      }
    },

    MuiBadge: {
      styleOverrides: {
        badge: ({ theme }) => ({
          minWidth: 20,
          height: 20,
          padding: theme.spacing(0, 0.75),
          borderRadius: 999,
          fontWeight: 700,
          letterSpacing: '0.01em',
          backgroundImage: gradients.buttonPrimary,
          boxShadow: (getVisualTokens(theme).shadow || {}).sm || 'none',
          border: `1px solid ${(getVisualTokens(theme).border || {}).inverse || alpha(theme.palette.background.paper, 0.9)}`
        })
      }
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: ({ theme }) => ({
          height: 7,
          borderRadius: 999,
          overflow: 'hidden',
          backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.08 : 0.16),
          boxShadow: `inset 0 0 0 1px ${alpha(theme.palette.primary.main, isLight ? 0.08 : 0.14)}`
        }),
        bar: ({ theme }) => ({
          borderRadius: 999,
          backgroundImage: gradients.buttonPrimary
        }),
        dashed: {
          display: 'none'
        }
      }
    },

    MuiCircularProgress: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.primary.main,
          filter: `drop-shadow(0 4px 10px ${alpha(theme.palette.primary.main, isLight ? 0.12 : 0.2)})`
        }),
        circle: {
          strokeLinecap: 'round'
        }
      }
    },

    MuiSkeleton: {
      defaultProps: {
        animation: 'wave'
      },
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: alpha(theme.palette.text.primary, isLight ? 0.08 : 0.14)
        }),
        text: {
          borderRadius: 8,
          transform: 'scale(1, 0.88)'
        },
        rounded: {
          borderRadius: 14
        },
        circular: {
          borderRadius: '50%'
        },
        wave: ({ theme }) => ({
          '&::after': {
            background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.common.white, isLight ? 0.36 : 0.08)}, transparent)`
          }
        })
      }
    }
  };
};
