import { alpha } from '@mui/material/styles';
import { getGradients } from './gradients';
import {
  layoutTokens,
  motionTokens,
  shapeTokens,
  spacingTokens,
  typographyRoleTokens
} from './tokens';

const buildGlassSurface = (
  theme,
  {
    radius,
    borderAlpha = 0.18,
    backgroundAlpha = 0.74,
    blur = 16,
    shadowAlpha = 0.16
  } = {}
) => {
  const resolvedRadius = radius ?? shapeTokens.cardRadius;

  return {
    borderRadius: resolvedRadius,
    border: `1px solid ${alpha(theme.palette.primary.main, borderAlpha)}`,
    backgroundColor: alpha(theme.palette.background.paper, backgroundAlpha),
    backdropFilter: `blur(${blur}px) saturate(145%)`,
    WebkitBackdropFilter: `blur(${blur}px) saturate(145%)`,
    boxShadow: `0 14px 36px ${alpha(theme.palette.text.primary, shadowAlpha)}`
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

  const getCardBorder = (theme) =>
    `1px solid ${alpha(theme.palette.primary.main, isLight ? 0.14 : 0.22)}`;

  const getCardShadow = (theme) =>
    `0 16px 38px ${alpha(theme.palette.text.primary, isLight ? 0.14 : 0.26)}`;

  const getHoverLiftShadow = (theme) =>
    `0 20px 48px ${alpha(theme.palette.text.primary, isLight ? 0.18 : 0.3)}`;

  const getHoverLift = (theme) => ({
    transition: `transform ${microMotion}, box-shadow ${microMotion}, border-color ${microMotion}`,
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: getHoverLiftShadow(theme)
    }
  });

  const getCardSurface = (theme, { soft = false } = {}) => ({
    ...buildGlassSurface(theme, {
      borderAlpha: soft ? (isLight ? 0.12 : 0.2) : isLight ? 0.16 : 0.24,
      backgroundAlpha: soft ? (isLight ? 0.72 : 0.66) : isLight ? 0.8 : 0.72,
      blur: soft ? 20 : 16,
      shadowAlpha: soft ? (isLight ? 0.12 : 0.24) : isLight ? 0.16 : 0.28
    }),
    backgroundImage: soft ? gradients.cardSurfaceSoft : gradients.cardSurface
  });

  const getDashboardGlass = (theme) => ({
    ...buildGlassSurface(theme, {
      borderAlpha: isLight ? 0.2 : 0.24,
      backgroundAlpha: isLight ? 0.68 : 0.66,
      blur: 22,
      shadowAlpha: isLight ? 0.17 : 0.3
    }),
    backgroundImage: gradients.dashboardGlass
  });

  const getTableSurface = (theme) => ({
    ...buildGlassSurface(theme, {
      radius: 18,
      borderAlpha: isLight ? 0.12 : 0.16,
      backgroundAlpha: isLight ? 0.88 : 0.74,
      blur: 10,
      shadowAlpha: isLight ? 0.1 : 0.22
    }),
    backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, isLight ? 0.92 : 0.72)} 0%, ${alpha(theme.palette.background.default, isLight ? 0.7 : 0.56)} 100%)`,
    overflow: 'hidden'
  });

  return {
    MuiCssBaseline: {
      styleOverrides: (theme) => {
        const sidebarTextPrimary = theme.palette.text.primary;
        const sidebarTextSecondary = alpha(theme.palette.text.secondary, 0.88);
        const sidebarIconColor = alpha(theme.palette.text.secondary, 0.9);
        const sidebarActiveIndicator = theme.palette.primary.main;
        const sidebarHoverBackground = alpha(theme.palette.primary.main, isLight ? 0.1 : 0.12);
        const sidebarActiveBackground = alpha(theme.palette.primary.main, isLight ? 0.18 : 0.2);
        const sidebarDivider = alpha(theme.palette.divider, isLight ? 0.8 : 0.78);
        const sidebarSurfaceBorder = alpha(theme.palette.primary.main, isLight ? 0.14 : 0.2);
        const headerSurface = alpha(theme.palette.background.paper, isLight ? 0.72 : 0.66);
        const headerBorder = alpha(theme.palette.primary.main, isLight ? 0.16 : 0.22);

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

          '.MuiContainer-root.crm-page-container': {
            width: '100%',
            maxWidth: `${contentMaxWidth}px !important`,
            marginLeft: 'auto',
            marginRight: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(pageGap),
            paddingTop: theme.spacing(containerPaddingY.xs),
            paddingBottom: theme.spacing(containerPaddingY.xs),
            paddingLeft: theme.spacing(containerPaddingX.xs),
            paddingRight: theme.spacing(containerPaddingX.xs),
            [theme.breakpoints.up('md')]: {
              paddingTop: theme.spacing(containerPaddingY.md),
              paddingBottom: theme.spacing(containerPaddingY.md),
              paddingLeft: theme.spacing(containerPaddingX.md),
              paddingRight: theme.spacing(containerPaddingX.md)
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
            fontSize: pageTypography.title.fontSize,
            lineHeight: pageTypography.title.lineHeight,
            letterSpacing: pageTypography.title.letterSpacing,
            color: theme.palette.text.primary
          },
          '.MuiTypography-root.crm-page-subtitle': {
            fontWeight: pageTypography.subtitle.fontWeight,
            fontSize: pageTypography.subtitle.fontSize,
            lineHeight: pageTypography.subtitle.lineHeight,
            letterSpacing: pageTypography.subtitle.letterSpacing,
            color: theme.palette.text.secondary,
            maxWidth: 920
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
            padding: theme.spacing(4, 3),
            textAlign: 'center'
          },
          '.MuiStack-root.crm-table-loading': {
            padding: theme.spacing(2)
          },
          '.MuiLinearProgress-root.crm-progress-compact': {
            width: 120
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
            boxShadow: `0 10px 22px ${alpha(theme.palette.primary.main, isLight ? 0.24 : 0.46)}`,
            animation: 'crm-soft-float 5.8s ease-in-out infinite'
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
            gap: theme.spacing(2)
          },
          '.MuiFormControl-root.crm-form__field': {
            margin: 0
          },
          '.MuiStack-root.crm-form__actions': {
            marginTop: theme.spacing(1),
            justifyContent: 'flex-end'
          },

          '.MuiBox-root.crm-global-search': {
            position: 'relative',
            width: '100%'
          },
          '.MuiPaper-root.crm-global-search__input-shell': {
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing(1.25),
            padding: theme.spacing(0.65, 1.6),
            borderRadius: 15,
            border: `1px solid ${alpha(theme.palette.primary.main, isLight ? 0.14 : 0.26)}`,
            backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.76 : 0.62),
            backdropFilter: 'blur(14px) saturate(145%)',
            WebkitBackdropFilter: 'blur(14px) saturate(145%)',
            boxShadow: `0 8px 22px ${alpha(theme.palette.text.primary, isLight ? 0.12 : 0.34)}`,
            transition: theme.transitions.create(['border-color', 'box-shadow', 'transform'], {
              duration: microMotionMs
            })
          },
          '.MuiPaper-root.crm-global-search__input-shell--active': {
            borderColor: alpha(theme.palette.primary.main, isLight ? 0.4 : 0.56),
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, isLight ? 0.2 : 0.3)}, 0 10px 24px ${alpha(theme.palette.text.primary, isLight ? 0.14 : 0.38)}`,
            transform: 'translateY(-1px)'
          },
          '.MuiInputBase-root.crm-global-search__input': {
            flex: 1,
            fontSize: '0.875rem'
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
              borderAlpha: isLight ? 0.14 : 0.24,
              backgroundAlpha: isLight ? 0.78 : 0.62,
              blur: 16,
              shadowAlpha: isLight ? 0.14 : 0.34
            }),
            overflow: 'hidden'
          },
          '.MuiList-root.crm-global-search__list': {
            padding: 0
          },
          '.MuiListItemButton-root.crm-global-search__item': {
            padding: theme.spacing(1.2, 2),
            gap: theme.spacing(1.5),
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
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.12 : 0.24)
          },
          '.MuiStack-root.crm-global-search__state': {
            padding: theme.spacing(2)
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
            ...getHoverLift(theme)
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
            display: 'flex',
            minHeight: '100vh',
            backgroundColor: 'transparent',
            animation: `crm-fade-in ${microMotion}`
          },
          '.MuiBox-root.crm-app-shell__main': {
            flexGrow: 1,
            width: '100%',
            minHeight: '100vh',
            backgroundColor: 'transparent',
            paddingBottom: theme.spacing(3)
          },
          '.MuiBox-root.crm-app-shell__content': {
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(pageGap),
            paddingTop: theme.spacing(1)
          },
          '.MuiToolbar-root.crm-app-shell__offset': {
            minHeight: 72,
            [theme.breakpoints.up('md')]: {
              minHeight: 78
            }
          },

          '.MuiAppBar-root.crm-app-bar': {
            zIndex: theme.zIndex.drawer + 1,
            borderBottom: `1px solid ${headerBorder}`,
            backdropFilter: 'blur(20px) saturate(150%)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            backgroundColor: headerSurface,
            boxShadow: `0 8px 28px ${alpha(theme.palette.text.primary, isLight ? 0.08 : 0.3)}`,
            transition: theme.transitions.create(['width', 'margin-left'], {
              duration: motionTokens.standardDurationMs,
              easing: motionTokens.standardEasing
            })
          },
          '.MuiAppBar-root.crm-app-bar--expanded': {
            width: `calc(100% - ${layoutTokens.drawerExpanded}px)`,
            marginLeft: layoutTokens.drawerExpanded
          },
          '.MuiAppBar-root.crm-app-bar--collapsed': {
            width: `calc(100% - ${layoutTokens.drawerCollapsed}px)`,
            marginLeft: layoutTokens.drawerCollapsed
          },
          '.MuiAppBar-root.crm-app-bar--mobile': {
            width: '100%',
            marginLeft: 0
          },
          '.MuiToolbar-root.crm-app-bar__toolbar': {
            minHeight: 72,
            gap: theme.spacing(2),
            paddingLeft: theme.spacing(2),
            paddingRight: theme.spacing(2),
            [theme.breakpoints.up('md')]: {
              minHeight: 78,
              paddingLeft: theme.spacing(3),
              paddingRight: theme.spacing(3)
            }
          },
          '.MuiContainer-root.crm-app-bar__inner': {
            width: '100%',
            maxWidth: `${contentMaxWidth}px !important`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: theme.spacing(2)
          },
          '.MuiStack-root.crm-app-bar__left': {
            flex: 1,
            minWidth: 0,
            maxWidth: '100%',
            [theme.breakpoints.up('md')]: {
              maxWidth: 640
            }
          },
          '.MuiBox-root.crm-app-bar__search': {
            flexGrow: 1,
            width: '100%',
            maxWidth: '100%'
          },
          '.MuiStack-root.crm-app-bar__user-area': {
            marginLeft: 'auto',
            gap: theme.spacing(1),
            flexShrink: 0,
            [theme.breakpoints.down('sm')]: {
              gap: theme.spacing(0.65)
            }
          },
          '.MuiButton-root.crm-app-bar__quick-trigger': {
            minHeight: 38,
            padding: theme.spacing(0.6, 1.5),
            borderRadius: 12,
            textTransform: 'none',
            whiteSpace: 'nowrap',
            color: theme.palette.text.primary,
            border: `1px solid ${alpha(theme.palette.primary.main, isLight ? 0.24 : 0.38)}`,
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.11 : 0.2),
            boxShadow: `0 10px 22px ${alpha(theme.palette.primary.main, isLight ? 0.16 : 0.28)}`,
            '&:hover': {
              borderColor: alpha(theme.palette.primary.main, isLight ? 0.38 : 0.52),
              backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.18 : 0.28)
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
            border: `1px solid ${alpha(theme.palette.primary.main, isLight ? 0.18 : 0.3)}`,
            color: theme.palette.text.primary,
            backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.62 : 0.36),
            boxShadow: `0 8px 18px ${alpha(theme.palette.text.primary, isLight ? 0.08 : 0.24)}`,
            '&:hover': {
              borderColor: alpha(theme.palette.primary.main, isLight ? 0.34 : 0.48),
              backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.16 : 0.26)
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
            boxShadow: `0 6px 14px ${alpha(theme.palette.primary.main, isLight ? 0.24 : 0.38)}`
          },
          '.MuiBox-root.crm-app-bar__user-info': {
            display: 'none',
            [theme.breakpoints.up('sm')]: {
              display: 'block'
            }
          },
          '.MuiButton-root.crm-app-bar__user-trigger': {
            padding: theme.spacing(0.42, 0.95),
            borderRadius: 15,
            textTransform: 'none',
            color: theme.palette.text.primary,
            backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.42 : 0.24),
            border: `1px solid ${alpha(theme.palette.primary.main, isLight ? 0.14 : 0.24)}`,
            boxShadow: `0 8px 20px ${alpha(theme.palette.text.primary, isLight ? 0.08 : 0.26)}`,
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.12 : 0.24)
            },
            [theme.breakpoints.down('sm')]: {
              minWidth: 0,
              padding: theme.spacing(0.3, 0.45),
              '& .MuiButton-endIcon': {
                display: 'none'
              }
            }
          },
          '.MuiButton-root.crm-app-bar__user-trigger .MuiButton-endIcon': {
            marginLeft: theme.spacing(0.5)
          },
          '.MuiIconButton-root.crm-app-bar__theme-toggle': {
            border: `1px solid ${alpha(theme.palette.primary.main, isLight ? 0.16 : 0.28)}`,
            color: theme.palette.text.primary,
            backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.6 : 0.34),
            boxShadow: `0 8px 20px ${alpha(theme.palette.text.primary, isLight ? 0.08 : 0.24)}`,
            '&:hover': {
              borderColor: alpha(theme.palette.primary.main, isLight ? 0.36 : 0.5),
              backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.16 : 0.26)
            }
          },
          '.MuiMenu-paper.crm-app-bar__menu': {
            ...buildGlassSurface(theme, {
              radius: 16,
              borderAlpha: isLight ? 0.14 : 0.24,
              backgroundAlpha: isLight ? 0.78 : 0.62,
              blur: 14,
              shadowAlpha: isLight ? 0.13 : 0.34
            }),
            minWidth: 220
          },
          '.MuiMenu-paper.crm-app-bar__quick-menu': {
            minWidth: 296
          },
          '.MuiMenu-paper.crm-app-bar__notification-menu': {
            minWidth: 320,
            maxWidth: 360
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
            borderRight: `1px solid ${alpha(theme.palette.primary.main, isLight ? 0.24 : 0.36)}`,
            backgroundImage: `linear-gradient(164deg, ${alpha(theme.palette.background.default, isLight ? 0.78 : 0.84)} 0%, ${alpha(theme.palette.background.paper, isLight ? 0.72 : 0.8)} 58%, ${alpha(theme.palette.background.default, isLight ? 0.68 : 0.76)} 100%), ${gradients.sidebarBackground}`,
            backgroundColor: alpha(theme.palette.background.default, isLight ? 0.74 : 0.84),
            backdropFilter: 'blur(12px) saturate(138%)',
            WebkitBackdropFilter: 'blur(12px) saturate(138%)',
            color: sidebarTextPrimary,
            overflow: 'hidden',
            borderRadius: '0 24px 24px 0',
            boxShadow: `inset -1px 0 0 ${alpha(theme.palette.text.primary, isLight ? 0.04 : 0.14)}, 0 22px 42px ${alpha(theme.palette.text.primary, isLight ? 0.12 : 0.38)}`,
            transition: theme.transitions.create(['width', 'background-color', 'border-color', 'box-shadow'], {
              duration: motionTokens.standardDurationMs,
              easing: motionTokens.standardEasing
            }),
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: `radial-gradient(circle at 14% 8%, ${alpha(theme.palette.primary.light, isLight ? 0.3 : 0.24)} 0%, transparent 44%), radial-gradient(circle at 80% 92%, ${alpha(theme.palette.primary.main, isLight ? 0.18 : 0.16)} 0%, transparent 48%)`,
              opacity: isLight ? 0.32 : 0.56
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, isLight ? 0.16 : 0.05)} 0%, transparent 28%)`
            }
          },
          '.MuiDrawer-paper.crm-app-drawer__paper--expanded': {
            width: layoutTokens.drawerExpanded
          },
          '.MuiDrawer-paper.crm-app-drawer__paper--collapsed': {
            width: layoutTokens.drawerCollapsed
          },
          '.MuiDrawer-paper.crm-app-drawer__paper--mobile': {
            width: layoutTokens.drawerExpanded
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
            padding: theme.spacing(2.35, 2),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: theme.transitions.create(['padding'], {
              duration: motionTokens.standardDurationMs,
              easing: motionTokens.standardEasing
            })
          },
          '.MuiBox-root.crm-app-shell__drawer-header--collapsed': {
            padding: theme.spacing(2.1, 1.1),
            justifyContent: 'center'
          },
          '.MuiDivider-root.crm-app-shell__drawer-divider': {
            margin: theme.spacing(0, 1.4),
            borderColor: alpha(theme.palette.primary.main, isLight ? 0.2 : 0.3),
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
            borderColor: alpha(theme.palette.primary.main, isLight ? 0.16 : 0.28),
            backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.76 : 0.36),
            '&:hover': {
              backgroundColor: alpha(sidebarActiveIndicator, isLight ? 0.16 : 0.24),
              color: sidebarTextPrimary
            }
          },

          '.MuiList-root.crm-app-shell__nav-list': {
            padding: theme.spacing(2.15, 1.25, 2.35),
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(0.28),
            overflowY: 'auto',
            overflowX: 'hidden'
          },
          '.MuiList-root.crm-app-shell__nav-list--collapsed': {
            paddingLeft: theme.spacing(0.95),
            paddingRight: theme.spacing(0.95)
          },
          '.MuiListSubheader-root.crm-app-shell__section-title': {
            padding: theme.spacing(1.15, 1.1, 0.5),
            margin: 0,
            lineHeight: 1.2,
            fontSize: theme.typography.caption.fontSize,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: alpha(sidebarTextSecondary, 0.9),
            backgroundColor: 'transparent'
          },
          '.MuiDivider-root.crm-app-shell__section-divider': {
            margin: theme.spacing(1, 1.15),
            borderColor: sidebarDivider,
            opacity: 0.74
          },

          '.MuiListItemButton-root.crm-app-shell__nav-item': {
            marginBottom: theme.spacing(0.4),
            padding: theme.spacing(0.72, 1.05),
            borderRadius: 16,
            justifyContent: 'flex-start',
            minHeight: 52,
            color: sidebarTextPrimary,
            position: 'relative',
            overflow: 'hidden',
            isolation: 'isolate',
            border: `1px solid transparent`,
            transition: theme.transitions.create(
              ['background-color', 'color', 'transform', 'box-shadow', 'border-color'],
              { duration: microMotionMs }
            ),
            '&::before': {
              content: '""',
              position: 'absolute',
              left: theme.spacing(0.55),
              top: theme.spacing(0.72),
              bottom: theme.spacing(0.72),
              width: 3,
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
              background: `linear-gradient(92deg, ${alpha(theme.palette.primary.main, isLight ? 0.12 : 0.22)} 0%, transparent 60%)`,
              transition: `opacity ${microMotion}`
            },
            '&:hover': {
              backgroundColor: alpha(sidebarActiveIndicator, isLight ? 0.14 : 0.22),
              borderColor: alpha(sidebarActiveIndicator, isLight ? 0.26 : 0.38),
              color: sidebarTextPrimary,
              transform: 'translateX(2px)',
              boxShadow: `0 12px 24px ${alpha(theme.palette.text.primary, isLight ? 0.1 : 0.28)}`,
              '&::after': {
                opacity: 0.95
              }
            },
            '&.Mui-selected': {
              backgroundColor: alpha(sidebarActiveIndicator, isLight ? 0.2 : 0.32),
              borderColor: alpha(sidebarActiveIndicator, isLight ? 0.38 : 0.54),
              color: sidebarTextPrimary,
              transform: 'translateX(3px)',
              boxShadow: `0 14px 28px ${alpha(sidebarActiveIndicator, isLight ? 0.2 : 0.34)}`,
              '&::before': {
                backgroundColor: sidebarActiveIndicator,
                boxShadow: `0 0 14px ${alpha(sidebarActiveIndicator, isLight ? 0.5 : 0.66)}`
              },
              '&::after': {
                opacity: 1
              }
            },
            '&.Mui-selected:hover': {
              backgroundColor: alpha(sidebarActiveIndicator, isLight ? 0.22 : 0.36)
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
            marginRight: theme.spacing(1.35),
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
            width: 34,
            height: 34,
            borderRadius: 11,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.78 : 0.42),
            border: `1px solid ${alpha(theme.palette.primary.main, isLight ? 0.14 : 0.28)}`,
            boxShadow: `inset 0 1px 0 ${alpha(theme.palette.common.white, isLight ? 0.42 : 0.1)}, 0 8px 16px ${alpha(theme.palette.text.primary, isLight ? 0.08 : 0.24)}`,
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
            backgroundColor: alpha(sidebarActiveIndicator, isLight ? 0.2 : 0.3),
            borderColor: alpha(sidebarActiveIndicator, isLight ? 0.36 : 0.54),
            boxShadow: `0 10px 20px ${alpha(sidebarActiveIndicator, isLight ? 0.16 : 0.28)}`
          },
          '.MuiListItemButton-root.crm-app-shell__nav-item.Mui-selected .MuiListItemIcon-root.crm-app-shell__nav-icon': {
            color: theme.palette.primary.contrastText
          },
          '.MuiListItemButton-root.crm-app-shell__nav-item.Mui-selected .MuiBox-root.crm-app-shell__nav-icon-shell': {
            backgroundColor: sidebarActiveIndicator,
            borderColor: alpha(sidebarActiveIndicator, isLight ? 0.52 : 0.68),
            boxShadow: `0 12px 24px ${alpha(sidebarActiveIndicator, isLight ? 0.26 : 0.4)}`
          },
          '.MuiListItemText-root.crm-app-shell__nav-copy': {
            margin: 0,
            minWidth: 0,
            flex: '1 1 auto',
            maxWidth: 188,
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
            width: 33,
            height: 33
          },
          '.MuiAvatar-root.crm-avatar--md': {
            width: 38,
            height: 38
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
            gap: theme.spacing(pageGap),
            width: '100%'
          },
          '.MuiBox-root.crm-page__section': {
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(sectionGap)
          },
          '.MuiBox-root.crm-page__section--dense': {
            gap: theme.spacing(sectionDenseGap)
          },
          '.MuiStack-root.crm-page__header': {
            width: '100%',
            gap: theme.spacing(pageHeaderGap),
            paddingBottom: theme.spacing(2),
            marginBottom: theme.spacing(0.25)
          },
          '.MuiStack-root.crm-page__header--center': {
            alignItems: 'center',
            textAlign: 'center',
            justifyContent: 'center'
          },
          '.MuiStack-root.crm-page__header-copy': {
            gap: theme.spacing(pageHeaderCopyGap),
            maxWidth: 900
          },
          '.MuiStack-root.crm-page__header-actions': {
            gap: theme.spacing(pageHeaderActionsGap),
            flexWrap: 'wrap'
          },
          '.MuiTypography-root.crm-page__eyebrow': {
            fontWeight: labelTypography.default.fontWeight,
            fontSize: labelTypography.default.fontSize,
            lineHeight: labelTypography.default.lineHeight,
            textTransform: labelTypography.default.textTransform,
            letterSpacing: labelTypography.default.letterSpacing
          },
          '.MuiBreadcrumbs-root.crm-page__breadcrumbs': {
            fontSize: theme.typography.caption.fontSize,
            color: theme.palette.text.secondary
          },
          '.MuiLink-root.crm-page__breadcrumb-link': {
            fontWeight: 600,
            color: theme.palette.text.secondary
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

          '.MuiDialog-root.crm-dialog .MuiPaper-root': {
            borderRadius: 24,
            animation: 'crm-modal-enter 300ms ease-out',
            transformOrigin: 'center'
          },
          '.MuiDialogTitle-root.crm-dialog__title': {
            padding: theme.spacing(2.35, 3, 1.15),
            borderBottom: `1px solid ${alpha(theme.palette.divider, isLight ? 0.82 : 0.68)}`
          },
          '.MuiDialogContent-root.crm-dialog__content': {
            padding: theme.spacing(2.25, 3),
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(2)
          },
          '.MuiDialogActions-root.crm-dialog__actions': {
            padding: theme.spacing(1.4, 3, 2.1),
            justifyContent: 'flex-end',
            gap: theme.spacing(1.2),
            borderTop: `1px solid ${alpha(theme.palette.divider, isLight ? 0.8 : 0.64)}`
          },
          '.MuiStack-root.crm-dashboard': {
            gap: theme.spacing(3.25)
          },
          '.MuiPaper-root.crm-dashboard__hero': {
            ...getDashboardGlass(theme),
            padding: theme.spacing(3.6),
            position: 'relative',
            overflow: 'hidden',
            backgroundImage: `linear-gradient(154deg, ${alpha(theme.palette.primary.main, isLight ? 0.16 : 0.24)} 0%, ${alpha(theme.palette.background.paper, isLight ? 0.84 : 0.68)} 46%, ${alpha(theme.palette.background.default, isLight ? 0.76 : 0.58)} 100%)`,
            animation: `crm-fade-in ${microMotion}`,
            ...getHoverLift(theme),
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: `radial-gradient(circle at 86% 12%, ${alpha(theme.palette.primary.light, isLight ? 0.2 : 0.3)} 0%, transparent 42%)`
            }
          },
          '.MuiBox-root.crm-dashboard__hero-grid': {
            position: 'relative',
            zIndex: 1,
            display: 'grid',
            gap: theme.spacing(2.6),
            gridTemplateColumns: 'minmax(0, 1fr)',
            [theme.breakpoints.up('md')]: {
              gridTemplateColumns: 'minmax(0, 1.45fr) minmax(0, 0.85fr)',
              alignItems: 'center'
            }
          },
          '.MuiStack-root.crm-dashboard__hero-copy': {
            maxWidth: 760
          },
          '.MuiTypography-root.crm-dashboard__hero-eyebrow': {
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: alpha(theme.palette.primary.main, 0.92)
          },
          '.MuiTypography-root.crm-dashboard__hero-title': {
            fontWeight: 650,
            letterSpacing: '-0.025em'
          },
          '.MuiTypography-root.crm-dashboard__hero-copy-text': {
            maxWidth: 700
          },
          '.MuiStack-root.crm-dashboard__hero-kpis': {
            alignItems: 'flex-start',
            gap: theme.spacing(1.15),
            [theme.breakpoints.up('md')]: {
              alignItems: 'flex-end'
            }
          },
          '.MuiBox-root.crm-dashboard__hero-kpi': {
            ...buildGlassSurface(theme, {
              radius: 16,
              borderAlpha: isLight ? 0.16 : 0.24,
              backgroundAlpha: isLight ? 0.8 : 0.58,
              blur: 12,
              shadowAlpha: isLight ? 0.12 : 0.3
            }),
            minWidth: 176,
            padding: theme.spacing(1.25, 1.5),
            textAlign: 'right'
          },
          '.MuiChip-root.crm-dashboard__hero-chip': {
            borderColor: alpha(theme.palette.primary.main, isLight ? 0.38 : 0.52),
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.14 : 0.24),
            color: theme.palette.text.primary,
            fontWeight: 620
          },

          '.MuiBox-root.crm-dashboard__metrics-grid': {
            display: 'grid',
            gap: theme.spacing(2.2),
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
            padding: theme.spacing(2.4),
            minHeight: 220,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            animation: `crm-fade-in ${microMotion}`,
            ...getHoverLift(theme)
          },
          '.MuiBox-root.crm-dashboard__metric-icon': {
            width: 38,
            height: 38,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.16 : 0.28),
            border: `1px solid ${alpha(theme.palette.primary.main, isLight ? 0.28 : 0.42)}`,
            color: theme.palette.primary.main,
            transition: `transform ${microMotion}, background-color ${microMotion}`
          },
          '.MuiPaper-root.crm-dashboard__metric-card:hover .MuiBox-root.crm-dashboard__metric-icon': {
            transform: 'translateY(-1px)',
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.24 : 0.34)
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
            gap: theme.spacing(2.2),
            gridTemplateColumns: 'minmax(0, 1fr)',
            [theme.breakpoints.up('lg')]: {
              gridTemplateColumns: 'minmax(0, 1.18fr) minmax(0, 0.82fr)'
            }
          },
          '.MuiPaper-root.crm-dashboard__chart-card': {
            ...getDashboardGlass(theme),
            padding: theme.spacing(2.5),
            animation: `crm-fade-in ${microMotion}`,
            ...getHoverLift(theme)
          },
          '.MuiChip-root.crm-dashboard__chart-chip': {
            borderColor: alpha(theme.palette.primary.main, isLight ? 0.34 : 0.5),
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.12 : 0.22)
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
          '.MuiStack-root.crm-dashboard__mix-list': {
            marginTop: theme.spacing(0.6)
          },
          '.MuiStack-root.crm-dashboard__mix-row': {
            gap: theme.spacing(0.55)
          },
          '.MuiBox-root.crm-dashboard__mix-track': {
            width: '100%',
            height: 8,
            borderRadius: 999,
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.1 : 0.18),
            overflow: 'hidden'
          },
          '.MuiBox-root.crm-dashboard__mix-fill': {
            height: '100%',
            borderRadius: 999,
            background: gradients.buttonPrimary
          },

          '.MuiBox-root.crm-dashboard__lower-grid': {
            display: 'grid',
            gap: theme.spacing(2.2),
            gridTemplateColumns: 'minmax(0, 1fr)',
            [theme.breakpoints.up('lg')]: {
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 0.92fr)'
            }
          },
          '.MuiPaper-root.crm-dashboard__activity-card, .MuiPaper-root.crm-dashboard__indicator-card': {
            ...getDashboardGlass(theme),
            padding: theme.spacing(2.5),
            animation: `crm-fade-in ${microMotion}`,
            ...getHoverLift(theme)
          },
          '.MuiStack-root.crm-dashboard__activity-row': {
            padding: theme.spacing(0.25, 0)
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
            boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, isLight ? 0.1 : 0.18)}`
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
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.14 : 0.22),
            border: `1px solid ${alpha(theme.palette.primary.main, isLight ? 0.24 : 0.36)}`
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
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.1 : 0.18)
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

          '.MuiPaper-root.crm-client-detail__hero, .MuiPaper-root.crm-client-detail__tabs-shell, .MuiPaper-root.crm-layout-admin-panel, .MuiPaper-root.crm-layout-admin-panel__widget, .MuiPaper-root.crm-saldo-fields__syntax-help, .MuiPaper-root.crm-credit-import__empty-notice, .MuiCard-root.crm-credit-import__upload-card, .MuiPaper-root.crm-groups__permissions-panel, .MuiPaper-root.crm-card-outline': {
            ...getCardSurface(theme, { soft: true })
          },

          '.MuiBox-root.crm-client-detail__hero-meta, .MuiBox-root.crm-client-detail__summary-grid, .MuiBox-root.crm-client-detail__financial-grid': {
            gap: theme.spacing(2)
          },

          '.crm-dynamic-grid .react-grid-item.react-grid-placeholder': {
            borderRadius: 15,
            border: `1px dashed ${alpha(theme.palette.primary.main, isLight ? 0.44 : 0.56)}`,
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.14 : 0.26),
            boxShadow: `inset 0 0 0 1px ${alpha(theme.palette.primary.main, isLight ? 0.22 : 0.36)}`
          },
          '.MuiStack-root.crm-dynamic-grid__drag-handle': {
            border: `1px solid ${alpha(theme.palette.primary.main, isLight ? 0.2 : 0.32)}`,
            borderRadius: 12,
            padding: theme.spacing(0.5, 1),
            backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.74 : 0.52),
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
        root: {
          backgroundImage: 'none'
        },
        outlined: ({ theme }) => ({
          ...getCardSurface(theme, { soft: true })
        })
      },
      variants: [
        {
          props: { variant: 'page' },
          style: ({ theme }) => ({
            ...getCardSurface(theme, { soft: true }),
            ...getHoverLift(theme),
            padding: theme.spacing(cardPadding)
          })
        },
        {
          props: { variant: 'auth' },
          style: ({ theme }) => ({
            ...getCardSurface(theme),
            ...getHoverLift(theme),
            padding: theme.spacing(cardPadding + 0.5),
            [theme.breakpoints.down('sm')]: {
              padding: theme.spacing(3)
            }
          })
        },
        {
          props: { variant: 'panel' },
          style: ({ theme }) => ({
            ...getCardSurface(theme, { soft: true }),
            ...getHoverLift(theme),
            padding: theme.spacing(cardPadding)
          })
        },
        {
          props: { variant: 'panel-sm' },
          style: ({ theme }) => ({
            ...getCardSurface(theme, { soft: true }),
            ...getHoverLift(theme),
            padding: theme.spacing(cardPadding)
          })
        },
        {
          props: { variant: 'filter' },
          style: ({ theme }) => ({
            ...getCardSurface(theme, { soft: true }),
            ...getHoverLift(theme),
            padding: theme.spacing(cardPadding)
          })
        },
        {
          props: { variant: 'summary' },
          style: ({ theme }) => ({
            ...getCardSurface(theme, { soft: true }),
            ...getHoverLift(theme),
            padding: theme.spacing(cardPadding),
            flex: 1,
            minWidth: 0
          })
        },
        {
          props: { variant: 'table' },
          style: ({ theme }) => ({
            ...getTableSurface(theme),
            overflow: 'hidden',
            padding: 0
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
          padding: theme.spacing(cardPadding, cardPadding, 0)
        }),
        title: ({ theme }) => ({
          fontWeight: 620,
          fontSize: theme.typography.h6.fontSize
        }),
        subheader: {
          fontWeight: 500
        }
      }
    },

    MuiCardContent: {
      styleOverrides: {
        root: ({ theme }) => ({
          padding: theme.spacing(cardPadding),
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
          borderRadius: 14,
          minHeight: 42,
          padding: theme.spacing(1.05, 2.15),
          fontWeight: 610,
          fontSize: theme.typography.button.fontSize,
          lineHeight: 1.2,
          letterSpacing: '0.012em',
          textTransform: 'none',
          border: `1px solid ${alpha(theme.palette.divider, isLight ? 0.88 : 0.7)}`,
          transition: theme.transitions.create(
            ['transform', 'box-shadow', 'background-color', 'border-color', 'color'],
            { duration: motionTokens.microDurationMs, easing: motionTokens.microEasing }
          ),
          '&.Mui-focusVisible': {
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, isLight ? 0.22 : 0.32)}`
          },
          '&:not(.Mui-disabled):hover': {
            transform: 'translateY(-1px)'
          },
          '&:not(.Mui-disabled):active': {
            transform: 'translateY(0) scale(0.985)'
          },
          '&.Mui-disabled': {
            color: alpha(theme.palette.text.primary, 0.42),
            borderColor: alpha(theme.palette.divider, 0.5),
            backgroundColor: alpha(theme.palette.text.primary, isLight ? 0.06 : 0.12)
          }
        }),
        sizeSmall: ({ theme }) => ({
          minHeight: 34,
          borderRadius: 11,
          padding: theme.spacing(0.62, 1.4),
          fontSize: theme.typography.caption.fontSize
        }),
        sizeLarge: ({ theme }) => ({
          minHeight: 50,
          borderRadius: 16,
          padding: theme.spacing(1.25, 2.85),
          fontSize: theme.typography.body1.fontSize
        }),
        contained: ({ theme }) => ({
          color: theme.palette.primary.contrastText,
          backgroundImage: gradients.buttonPrimary,
          backgroundColor: theme.palette.primary.main,
          borderColor: alpha(theme.palette.primary.main, isLight ? 0.46 : 0.58),
          boxShadow: `0 10px 22px ${alpha(theme.palette.primary.main, isLight ? 0.28 : 0.42)}`,
          '&:hover': {
            backgroundImage: gradients.buttonPrimary,
            borderColor: alpha(theme.palette.primary.main, isLight ? 0.56 : 0.66),
            boxShadow: `0 14px 28px ${alpha(theme.palette.primary.main, isLight ? 0.34 : 0.48)}`
          }
        }),
        outlined: ({ theme }) => ({
          color: theme.palette.text.primary,
          borderColor: alpha(theme.palette.divider, isLight ? 0.88 : 0.72),
          backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.84 : 0.58),
          backdropFilter: 'blur(8px) saturate(135%)',
          WebkitBackdropFilter: 'blur(8px) saturate(135%)',
          boxShadow: `inset 0 1px 0 ${alpha(theme.palette.common.white, isLight ? 0.54 : 0.08)}`,
          '&:hover': {
            borderColor: alpha(theme.palette.primary.main, isLight ? 0.36 : 0.52),
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.1 : 0.2)
          }
        }),
        text: ({ theme }) => ({
          color: alpha(theme.palette.text.secondary, 0.96),
          borderColor: 'transparent',
          backgroundColor: 'transparent',
          boxShadow: 'none',
          '&:hover': {
            color: theme.palette.text.primary,
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.1 : 0.2)
          }
        }),
        containedSecondary: ({ theme }) => ({
          color: theme.palette.text.primary,
          backgroundImage: 'none',
          backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.9 : 0.64),
          borderColor: alpha(theme.palette.divider, isLight ? 0.86 : 0.72),
          boxShadow: `0 8px 18px ${alpha(theme.palette.text.primary, isLight ? 0.08 : 0.2)}`,
          '&:hover': {
            backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.98 : 0.72),
            borderColor: alpha(theme.palette.primary.main, isLight ? 0.32 : 0.48),
            boxShadow: `0 12px 24px ${alpha(theme.palette.text.primary, isLight ? 0.12 : 0.26)}`
          }
        }),
        outlinedSecondary: ({ theme }) => ({
          color: theme.palette.text.secondary,
          borderColor: alpha(theme.palette.divider, isLight ? 0.84 : 0.68),
          backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.66 : 0.44),
          '&:hover': {
            color: theme.palette.text.primary,
            borderColor: alpha(theme.palette.primary.main, isLight ? 0.34 : 0.5),
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.08 : 0.18)
          }
        })
      },
      variants: [
        {
          props: { variant: 'ghost' },
          style: ({ theme }) => ({
            color: alpha(theme.palette.text.secondary, 0.94),
            border: '1px solid transparent',
            backgroundColor: 'transparent',
            boxShadow: 'none',
            '&:hover': {
              color: theme.palette.text.primary,
              borderColor: alpha(theme.palette.divider, isLight ? 0.82 : 0.68),
              backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.08 : 0.18)
            }
          })
        }
      ]
    },

    MuiIconButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.62 : 0.38),
          border: `1px solid ${alpha(theme.palette.primary.main, isLight ? 0.14 : 0.24)}`,
          boxShadow: `0 8px 18px ${alpha(theme.palette.text.primary, isLight ? 0.08 : 0.24)}`,
          transition: `transform ${microMotion}, box-shadow ${microMotion}, background-color ${microMotion}`,
          '&:not(.Mui-disabled):hover': {
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.14 : 0.24),
            boxShadow: `0 10px 20px ${alpha(theme.palette.text.primary, isLight ? 0.12 : 0.3)}`,
            transform: 'translateY(-1px)'
          },
          '&:not(.Mui-disabled):active': {
            transform: 'translateY(0) scale(0.99)'
          }
        })
      }
    },

    MuiTextField: {
      defaultProps: {
        size: 'medium',
        variant: 'outlined'
      }
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 14,
          minHeight: 46,
          backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.86 : 0.56),
          backdropFilter: 'blur(10px) saturate(136%)',
          WebkitBackdropFilter: 'blur(10px) saturate(136%)',
          boxShadow: `inset 0 1px 0 ${alpha(theme.palette.common.white, isLight ? 0.58 : 0.08)}, 0 1px 2px ${alpha(theme.palette.text.primary, isLight ? 0.06 : 0.2)}`,
          transition: theme.transitions.create(
            ['box-shadow', 'border-color', 'background-color', 'transform'],
            { duration: motionTokens.microDurationMs, easing: motionTokens.microEasing }
          ),
          '& .MuiOutlinedInput-input': {
            padding: theme.spacing(1.45, 1.65)
          },
          '& .MuiOutlinedInput-input.MuiInputBase-inputSizeSmall': {
            padding: theme.spacing(1.1, 1.35)
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(theme.palette.divider, isLight ? 0.84 : 0.66),
            borderWidth: 1
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(theme.palette.primary.main, isLight ? 0.32 : 0.5)
          },
          '&.Mui-focused': {
            backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.96 : 0.68),
            boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main, isLight ? 0.32 : 0.5)}, 0 0 0 4px ${alpha(theme.palette.primary.main, isLight ? 0.16 : 0.26)}, 0 10px 24px ${alpha(theme.palette.primary.main, isLight ? 0.12 : 0.24)}`,
            transform: 'translateY(-1px)'
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(theme.palette.primary.main, isLight ? 0.5 : 0.62),
            borderWidth: 1
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
            color: alpha(theme.palette.text.secondary, 0.72),
            fontWeight: 470,
            letterSpacing: '0.01em',
            opacity: 1
          }
        }),
        inputMultiline: ({ theme }) => ({
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
          }
        })
      }
    },

    MuiInputLabel: {
      styleOverrides: {
        root: ({ theme }) => ({
          fontWeight: 560,
          fontSize: '0.78rem',
          lineHeight: 1.2,
          letterSpacing: '0.04em',
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
          color: alpha(theme.palette.text.secondary, 0.9)
        })
      }
    },

    MuiSelect: {
      styleOverrides: {
        icon: ({ theme }) => ({
          color: alpha(theme.palette.text.secondary, 0.92)
        }),
        select: {
          '&:focus': {
            borderRadius: 14
          }
        }
      }
    },

    MuiAutocomplete: {
      styleOverrides: {
        paper: ({ theme }) => ({
          ...buildGlassSurface(theme, {
            radius: 14,
            borderAlpha: isLight ? 0.12 : 0.24,
            backgroundAlpha: isLight ? 0.92 : 0.74,
            blur: 12,
            shadowAlpha: isLight ? 0.12 : 0.28
          }),
          marginTop: theme.spacing(0.8)
        }),
        option: ({ theme }) => ({
          minHeight: 38,
          paddingTop: theme.spacing(0.8),
          paddingBottom: theme.spacing(0.8),
          fontSize: '0.88rem',
          '&[aria-selected="true"]': {
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.14 : 0.26)
          },
          '&.Mui-focused': {
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.1 : 0.22)
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
            backgroundColor: alpha(theme.palette.background.default, isLight ? 0.38 : 0.62),
            backdropFilter: 'blur(12px) saturate(122%)',
            WebkitBackdropFilter: 'blur(12px) saturate(122%)'
          },
          '& .MuiDialog-container': {
            padding: theme.spacing(2.2),
            [theme.breakpoints.up('sm')]: {
              padding: theme.spacing(3)
            }
          }
        }),
        paper: ({ theme }) => ({
          ...buildGlassSurface(theme, {
            radius: 24,
            borderAlpha: isLight ? 0.12 : 0.22,
            backgroundAlpha: isLight ? 0.9 : 0.74,
            blur: 18,
            shadowAlpha: isLight ? 0.12 : 0.34
          }),
          position: 'relative',
          overflow: 'hidden',
          margin: 0,
          backgroundImage: `linear-gradient(170deg, ${alpha(theme.palette.background.paper, isLight ? 0.94 : 0.76)} 0%, ${alpha(theme.palette.background.default, isLight ? 0.82 : 0.62)} 100%)`,
          boxShadow: `0 18px 44px ${alpha(theme.palette.text.primary, isLight ? 0.16 : 0.42)}`,
          animation: 'crm-modal-enter 300ms ease-out',
          transformOrigin: 'center',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, isLight ? 0.22 : 0.06)} 0%, transparent 38%)`
          }
        })
      }
    },

    MuiDialogTitle: {
      styleOverrides: {
        root: ({ theme }) => ({
          padding: theme.spacing(2.35, 3, 1.2),
          fontWeight: 630,
          letterSpacing: '-0.01em',
          borderBottom: `1px solid ${alpha(theme.palette.divider, isLight ? 0.84 : 0.66)}`
        })
      }
    },

    MuiDialogContent: {
      styleOverrides: {
        root: ({ theme }) => ({
          padding: theme.spacing(2.3, 3),
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing(1.9),
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
          padding: theme.spacing(1.45, 3, 2.15),
          justifyContent: 'flex-end',
          gap: theme.spacing(1.1),
          borderTop: `1px solid ${alpha(theme.palette.divider, isLight ? 0.82 : 0.64)}`,
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
          boxShadow: theme.shadows[8],
          fontSize: theme.typography.body2.fontSize,
          fontWeight: 560
        })
      }
    },

    MuiAlert: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 15,
          fontSize: theme.typography.body2.fontSize,
          fontWeight: 560,
          backdropFilter: 'blur(10px)'
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
            minWidth: 760
          },
          '& .MuiTableHead-root .MuiTableRow-root': {
            height: 54
          }
        })
      }
    },

    MuiTableContainer: {
      styleOverrides: {
        root: ({ theme }) => ({
          width: '100%',
          overflowX: 'auto',
          '&.crm-table-container': {
            borderRadius: 18
          },
          '&::-webkit-scrollbar': {
            width: 10,
            height: 10
          },
          '&::-webkit-scrollbar-thumb': {
            borderRadius: 999,
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.22 : 0.36)
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
          backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.82 : 0.58),
          '& .MuiTableCell-root': {
            borderBottom: `1px solid ${alpha(theme.palette.divider, isLight ? 0.9 : 0.82)}`
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
          paddingTop: theme.spacing(1.55),
          paddingBottom: theme.spacing(1.55),
          backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.8 : 0.58),
          backdropFilter: 'blur(8px) saturate(132%)',
          WebkitBackdropFilter: 'blur(8px) saturate(132%)',
          '&.MuiTableCell-stickyHeader': {
            backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.88 : 0.64)
          }
        }),
        body: ({ theme }) => ({
          fontSize: '0.89rem',
          lineHeight: 1.46,
          color: theme.palette.text.primary,
          fontWeight: 500
        }),
        root: ({ theme }) => ({
          padding: theme.spacing(2.05, 2.5),
          borderBottom: `1px solid ${alpha(theme.palette.divider, isLight ? 0.72 : 0.64)}`,
          transition: theme.transitions.create(['border-color', 'background-color'], {
            duration: microMotionMs
          }),
          '&.MuiTableCell-sizeSmall': {
            padding: theme.spacing(1.35, 1.9)
          },
          '&.crm-table__cell--numeric': {
            fontVariantNumeric: 'tabular-nums'
          },
          '&.crm-table__cell--actions': {
            width: '1%',
            whiteSpace: 'nowrap',
            paddingRight: theme.spacing(1.75)
          },
          '&.crm-table__cell--actions .MuiStack-root': {
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: theme.spacing(0.5),
            flexWrap: 'nowrap'
          },
          '&.crm-table__cell--actions .MuiIconButton-root': {
            width: 31,
            height: 31,
            padding: 0,
            borderRadius: 10,
            border: `1px solid ${alpha(theme.palette.divider, isLight ? 0.9 : 0.78)}`,
            backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.72 : 0.44),
            boxShadow: 'none',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
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
            borderColor: alpha(theme.palette.primary.main, isLight ? 0.36 : 0.52),
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.16 : 0.26),
            boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, isLight ? 0.14 : 0.24)}`,
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
          '&.MuiTableRow-hover:hover': {
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.08 : 0.17),
            boxShadow: `inset 0 1px 0 ${alpha(theme.palette.primary.main, isLight ? 0.12 : 0.24)}`
          },
          '&.MuiTableRow-hover:hover .MuiTableCell-root': {
            borderBottomColor: alpha(theme.palette.primary.main, isLight ? 0.2 : 0.34)
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
          borderTop: `1px solid ${alpha(theme.palette.divider, isLight ? 0.92 : 0.84)}`,
          color: theme.palette.text.secondary,
          backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.8 : 0.62),
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)'
        }),
        toolbar: ({ theme }) => ({
          minHeight: 60,
          paddingLeft: theme.spacing(2.2),
          paddingRight: theme.spacing(2.2),
          color: theme.palette.text.secondary
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
            border: `1px solid ${alpha(theme.palette.divider, isLight ? 0.86 : 0.74)}`,
            backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.72 : 0.46),
            boxShadow: 'none',
            color: theme.palette.text.primary,
            '&:hover': {
              borderColor: alpha(theme.palette.primary.main, isLight ? 0.34 : 0.48),
              backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.14 : 0.24)
            }
          }
        })
      }
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: ({ theme }) => ({
          borderRadius: 10,
          padding: theme.spacing(0.6, 1),
          fontSize: '0.72rem',
          fontWeight: 560,
          letterSpacing: '0.01em',
          color: theme.palette.text.primary,
          backgroundColor: alpha(theme.palette.background.paper, isLight ? 0.96 : 0.9),
          border: `1px solid ${alpha(theme.palette.divider, isLight ? 0.9 : 0.72)}`,
          boxShadow: `0 8px 20px ${alpha(theme.palette.text.primary, isLight ? 0.1 : 0.24)}`,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }),
        arrow: ({ theme }) => ({
          color: alpha(theme.palette.background.paper, isLight ? 0.96 : 0.9)
        })
      }
    },

    MuiTabs: {
      defaultProps: {
        textColor: 'primary',
        indicatorColor: 'primary'
      },
      styleOverrides: {
        root: {
          minHeight: 42
        },
        indicator: ({ theme }) => ({
          height: 3,
          borderRadius: 999
        })
      }
    },

    MuiTab: {
      styleOverrides: {
        root: ({ theme }) => ({
          minHeight: 42,
          padding: theme.spacing(1, 2),
          textTransform: 'none',
          fontWeight: 600,
          fontSize: theme.typography.body2.fontSize,
          borderRadius: 10,
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.08 : 0.18)
          },
          '&.Mui-selected': {
            color: theme.palette.primary.main
          }
        })
      }
    },

    MuiListItemButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 12
        })
      }
    },

    MuiChip: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 999,
          fontWeight: 560
        })
      }
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: ({ theme }) => ({
          height: 6,
          borderRadius: 999,
          backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.14 : 0.24)
        }),
        bar: ({ theme }) => ({
          borderRadius: 999
        })
      }
    }
  };
};
