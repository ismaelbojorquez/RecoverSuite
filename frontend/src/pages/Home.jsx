import {
  Activity,
  ArrowDown,
  ArrowUpRight,
  CircleCheckBig,
  FolderKanban,
  HandCoins,
  History,
  Percent,
  ShieldCheck,
  TrendingUp,
  TriangleAlert,
  Users,
  Wallet
} from 'lucide-react';
import { Box, Button, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useMemo } from 'react';
import { Page, PageContent, PageHeader } from '../components/layout/Page.jsx';
import IconRenderer from '../components/ui/IconRenderer.jsx';
import useNavigation from '../hooks/useNavigation.js';
import usePermissions from '../hooks/usePermissions.js';
import { buildRoutePath } from '../routes/paths.js';

const metricCards = [
  {
    title: 'Cobranza neta',
    value: '$4.21M',
    subtitle: 'Ingresos recuperados en los ultimos 30 dias',
    delta: '+14.2%',
    tone: 'positive',
    icon: HandCoins,
    series: [2.9, 3.1, 3.05, 3.4, 3.62, 3.88, 4.21]
  },
  {
    title: 'Promesas cumplidas',
    value: '78.6%',
    subtitle: 'Compromisos honrados por cartera activa',
    delta: '+3.1%',
    tone: 'positive',
    icon: CircleCheckBig,
    series: [68, 69, 71, 73, 74, 76, 78.6]
  },
  {
    title: 'Flujo de liquidez',
    value: '$9.84M',
    subtitle: 'Disponibilidad para operacion y acuerdos',
    delta: '+1.9%',
    tone: 'positive',
    icon: Wallet,
    series: [9.2, 9.28, 9.36, 9.31, 9.56, 9.62, 9.84]
  },
  {
    title: 'Riesgo operativo',
    value: '1.04%',
    subtitle: 'Desviacion sobre controles de cumplimiento',
    delta: '-0.4%',
    tone: 'negative',
    icon: ShieldCheck,
    series: [1.42, 1.34, 1.28, 1.21, 1.16, 1.09, 1.04]
  }
];

const trendSeries = [
  { label: 'Oct', value: 2.36 },
  { label: 'Nov', value: 2.62 },
  { label: 'Dic', value: 2.77 },
  { label: 'Ene', value: 3.05 },
  { label: 'Feb', value: 3.44 },
  { label: 'Mar', value: 3.92 }
];

const portfolioMix = [
  { label: 'Consumo', value: 42, amount: '$1.64M' },
  { label: 'Automotriz', value: 27, amount: '$1.04M' },
  { label: 'Hipotecario', value: 19, amount: '$0.74M' },
  { label: 'PyME', value: 12, amount: '$0.50M' }
];

const activityFeed = [
  {
    id: 'act-1',
    title: 'Batch de conciliacion completado',
    detail: '1,284 cuentas reconciliadas con estatus final.',
    time: 'Hace 6 min',
    tone: 'success'
  },
  {
    id: 'act-2',
    title: 'Alerta de morosidad temprana',
    detail: 'Segmento automotriz supero el umbral del 3.5%.',
    time: 'Hace 21 min',
    tone: 'warning'
  },
  {
    id: 'act-3',
    title: 'Nuevo acuerdo validado',
    detail: 'Equipo Legal aprobo 42 convenios de pago.',
    time: 'Hace 39 min',
    tone: 'neutral'
  },
  {
    id: 'act-4',
    title: 'Reglas de scoring actualizadas',
    detail: 'Modelo de riesgo v2.4 desplegado en produccion.',
    time: 'Hace 1 h',
    tone: 'success'
  }
];

const indicators = [
  {
    label: 'SLA de respuesta',
    value: '98.7%',
    target: 'Objetivo 97%',
    progress: 98.7,
    tone: 'positive',
    icon: TrendingUp
  },
  {
    label: 'Eficiencia de contacto',
    value: '87.4%',
    target: 'Objetivo 90%',
    progress: 87.4,
    tone: 'warning',
    icon: Activity
  },
  {
    label: 'Alertas criticas',
    value: '3 abiertas',
    target: 'Meta < 5',
    progress: 62,
    tone: 'neutral',
    icon: TriangleAlert
  }
];

const quickActions = [
  {
    label: 'Portafolios',
    description: 'Administra carteras y campos de saldo.',
    icon: FolderKanban,
    routeId: 'portfolios',
    permission: 'portfolios.read'
  },
  {
    label: 'Clientes',
    description: 'Consulta expedientes y seguimiento.',
    icon: Users,
    routeId: 'clients',
    permission: 'clients.read'
  },
  {
    label: 'Creditos',
    description: 'Supervisa exposicion y detalle financiero.',
    icon: Wallet,
    routeId: 'credits',
    permission: 'credits.read'
  },
  {
    label: 'Importacion',
    description: 'Carga informacion y valida mapeos.',
    icon: History,
    routeId: 'creditImport',
    permission: 'imports.write'
  },
  {
    label: 'Negociaciones',
    description: 'Ajusta niveles y reglas visibles.',
    icon: Percent,
    routeId: 'negotiationSettings',
    permission: 'negotiations.config.read'
  }
];

const buildSparklinePoints = (values, width = 120, height = 38, padding = 4) => {
  if (!values || values.length === 0) {
    return '';
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = values.length > 1 ? (width - padding * 2) / (values.length - 1) : 0;

  return values
    .map((value, index) => {
      const x = padding + index * step;
      const y = padding + ((max - value) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');
};

const buildAreaChart = (values, width = 560, height = 218, padding = 18) => {
  if (!values || values.length === 0) {
    return { areaPath: '', linePath: '', points: [] };
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const innerHeight = height - padding * 2;
  const step = values.length > 1 ? (width - padding * 2) / (values.length - 1) : 0;

  const points = values.map((value, index) => {
    const x = padding + index * step;
    const y = padding + ((max - value) / range) * innerHeight;
    return { x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');

  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  const areaPath = `${linePath} L ${lastPoint.x.toFixed(2)} ${(height - padding).toFixed(2)} L ${firstPoint.x.toFixed(2)} ${(height - padding).toFixed(2)} Z`;

  return { areaPath, linePath, points };
};

export default function Home() {
  const theme = useTheme();
  const { navigate } = useNavigation();
  const { hasPermission } = usePermissions();

  const trendChart = useMemo(
    () => buildAreaChart(trendSeries.map((point) => point.value)),
    []
  );
  const trendFillStart = alpha(
    theme.palette.primary.main,
    theme.palette.mode === 'light' ? 0.28 : 0.34
  );
  const trendFillEnd = alpha(theme.palette.primary.main, 0);

  const heroHighlights = useMemo(
    () => metricCards.slice(0, 2),
    []
  );

  const visibleQuickActions = useMemo(
    () =>
      quickActions.filter((action) =>
        action.permission ? hasPermission(action.permission) : true
      ),
    [hasPermission]
  );

  const controlSignals = useMemo(
    () => [
      {
        label: metricCards[0].title,
        value: metricCards[0].delta,
        note: metricCards[0].subtitle,
        tone: metricCards[0].tone
      },
      {
        label: indicators[2].label,
        value: indicators[2].value,
        note: indicators[2].target,
        tone: indicators[2].tone
      },
      {
        label: metricCards[3].title,
        value: metricCards[3].value,
        note: metricCards[3].subtitle,
        tone: 'neutral'
      }
    ],
    []
  );

  const chartSummary = useMemo(() => {
    const first = trendSeries[0];
    const last = trendSeries[trendSeries.length - 1];
    const change = ((last.value - first.value) / first.value) * 100;

    return [
      {
        label: 'Ultimo ciclo',
        value: `$${last.value.toFixed(2)}M`,
        note: last.label
      },
      {
        label: 'Variacion acumulada',
        value: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
        note: `Desde ${first.label}`
      }
    ];
  }, []);

  const topPortfolio = portfolioMix[0];
  const controlLead = indicators[0];

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: 'Inicio' }]}
        eyebrow="Analitica operativa"
        title="Dashboard ejecutivo de recuperacion"
        subtitle="Monitoreo integral de cobranza, liquidez y riesgo con una lectura ejecutiva más clara, ordenada y accionable."
        actions={
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip size="small" variant="outlined" label="Vista ejecutiva" />
            <Chip size="small" variant="outlined" label="Actualizacion cada 5 min" />
          </Stack>
        }
      />

      <PageContent>
        <Stack className="crm-dashboard">
          <Paper variant="panel" className="crm-dashboard__hero">
            <Box className="crm-dashboard__hero-grid">
              <Stack spacing={1.6} className="crm-dashboard__hero-copy">
                <Typography variant="overline" className="crm-dashboard__hero-eyebrow">
                  RecoverSuite Intelligence
                </Typography>
                <Typography variant="h4" className="crm-dashboard__hero-title">
                  Control ejecutivo de la operacion de recuperacion
                </Typography>
                <Typography
                  variant="body2"
                  className="crm-dashboard__hero-copy-text"
                  color="text.secondary"
                >
                  Unifica rendimiento, riesgo y ejecucion diaria en una vista tipo SaaS enterprise,
                  con bloques mas legibles para seguimiento rapido y toma de decisiones.
                </Typography>

                <Stack
                  direction="row"
                  spacing={0.9}
                  useFlexGap
                  flexWrap="wrap"
                  className="crm-dashboard__hero-tags"
                >
                  <Chip
                    label="Flujo, riesgo y seguimiento unificados"
                    size="small"
                    variant="outlined"
                    className="crm-dashboard__hero-chip"
                  />
                  <Chip
                    label="Lectura ejecutiva inmediata"
                    size="small"
                    variant="outlined"
                    className="crm-dashboard__hero-chip"
                  />
                </Stack>

                <Box className="crm-dashboard__hero-highlight-grid">
                  {heroHighlights.map((metric) => (
                    <Box key={metric.title} className="crm-dashboard__hero-highlight">
                      <Typography variant="caption" className="crm-dashboard__hero-highlight-label">
                        {metric.title}
                      </Typography>
                      <Typography variant="h5" className="crm-dashboard__hero-highlight-value">
                        {metric.value}
                      </Typography>
                      <Typography
                        variant="caption"
                        className="crm-dashboard__hero-highlight-support"
                      >
                        {metric.subtitle}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Stack>

              <Stack className="crm-dashboard__hero-side">
                <Paper variant="outlined" className="crm-dashboard__control-card">
                  <Stack spacing={1.4}>
                    <Stack spacing={0.35} className="crm-dashboard__control-main">
                      <Typography variant="caption" className="crm-dashboard__control-label">
                        {controlLead.label}
                      </Typography>
                      <Typography variant="h3" className="crm-dashboard__control-value">
                        {controlLead.value}
                      </Typography>
                      <Typography
                        variant="body2"
                        className="crm-dashboard__control-support"
                      >
                        {controlLead.target} con seguimiento continuo desde la vista ejecutiva.
                      </Typography>
                    </Stack>

                    <Stack className="crm-dashboard__control-list">
                      {controlSignals.map((signal) => (
                        <Box
                          key={signal.label}
                          className={[
                            'crm-dashboard__control-item',
                            signal.tone ? `crm-dashboard__control-item--${signal.tone}` : ''
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          <Stack spacing={0.2} className="crm-dashboard__control-item-copy">
                            <Typography
                              variant="caption"
                              className="crm-dashboard__control-item-label"
                            >
                              {signal.label}
                            </Typography>
                            <Typography
                              variant="body2"
                              className="crm-dashboard__control-item-note"
                            >
                              {signal.note}
                            </Typography>
                          </Stack>
                          <Typography
                            variant="caption"
                            className="crm-dashboard__control-item-value"
                          >
                            {signal.value}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Stack>
                </Paper>

                <Paper variant="outlined" className="crm-dashboard__actions-card">
                  <Stack spacing={1.2}>
                    <Stack spacing={0.3} className="crm-dashboard__panel-header">
                      <Typography variant="subtitle1" className="crm-section-title">
                        Quick actions
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Accesos directos a los flujos operativos y administrativos más frecuentes.
                      </Typography>
                    </Stack>

                    <Box className="crm-dashboard__actions-grid">
                      {visibleQuickActions.length > 0 ? (
                        visibleQuickActions.map((action) => {
                          const ActionIcon = action.icon;

                          return (
                            <Button
                              key={action.routeId}
                              variant="outlined"
                              className="crm-dashboard__quick-action"
                              onClick={() => navigate(buildRoutePath(action.routeId))}
                            >
                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={1.1}
                                className="crm-dashboard__quick-action-content"
                              >
                                <Box className="crm-dashboard__quick-action-icon">
                                  <IconRenderer icon={ActionIcon} size="sm" />
                                </Box>
                                <Stack
                                  spacing={0.1}
                                  alignItems="flex-start"
                                  className="crm-dashboard__quick-action-copy"
                                >
                                  <Typography
                                    variant="body2"
                                    className="crm-dashboard__quick-action-label"
                                  >
                                    {action.label}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    className="crm-dashboard__quick-action-note"
                                  >
                                    {action.description}
                                  </Typography>
                                </Stack>
                              </Stack>
                            </Button>
                          );
                        })
                      ) : (
                        <Paper variant="outlined" className="crm-dashboard__quick-action-empty">
                          <Typography variant="body2" className="crm-text-medium">
                            No hay accesos directos disponibles
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            La vista mantiene el mismo dashboard, pero no hay modulos habilitados
                            para navegacion rapida en tu perfil actual.
                          </Typography>
                        </Paper>
                      )}
                    </Box>
                  </Stack>
                </Paper>
              </Stack>
            </Box>
          </Paper>

          <Box className="crm-dashboard__metrics-grid">
            {metricCards.map((metric) => {
              const Icon = metric.icon;
              const sparkline = buildSparklinePoints(metric.series);

              return (
                <Paper key={metric.title} variant="summary" className="crm-dashboard__metric-card">
                  <Stack spacing={2.1} className="crm-dashboard__metric-footer">
                    <Stack direction="row" className="crm-dashboard__metric-header">
                      <Box className="crm-dashboard__metric-icon">
                        <IconRenderer icon={Icon} size="sm" />
                      </Box>
                      <Stack
                        direction="row"
                        spacing={0.4}
                        alignItems="center"
                        className={[
                          'crm-dashboard__metric-delta',
                          metric.tone === 'negative'
                            ? 'crm-dashboard__metric-delta--negative'
                            : 'crm-dashboard__metric-delta--positive'
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {metric.tone === 'negative' ? (
                          <IconRenderer icon={ArrowDown} size="xs" />
                        ) : (
                          <IconRenderer icon={ArrowUpRight} size="xs" />
                        )}
                        <Typography variant="caption" className="crm-metric-delta">
                          {metric.delta}
                        </Typography>
                      </Stack>
                    </Stack>

                    <Stack spacing={0.35} className="crm-dashboard__metric-copy">
                      <Typography
                        variant="caption"
                        className="crm-metric-label crm-dashboard__metric-label"
                      >
                        {metric.title}
                      </Typography>
                      <Typography
                        variant="h4"
                        className="crm-dashboard__metric-value crm-metric-value"
                      >
                        {metric.value}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        className="crm-dashboard__metric-subtitle"
                      >
                        {metric.subtitle}
                      </Typography>
                    </Stack>

                    <Box className="crm-dashboard__sparkline" aria-hidden="true">
                      <svg viewBox="0 0 120 38" preserveAspectRatio="none">
                        <polyline points={sparkline} />
                      </svg>
                    </Box>
                  </Stack>
                </Paper>
              );
            })}
          </Box>

          <Box className="crm-dashboard__analytics-grid">
            <Paper variant="panel" className="crm-dashboard__chart-card crm-dashboard__chart-card--primary">
              <Stack spacing={1.7}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  className="crm-dashboard__chart-header"
                >
                  <Stack spacing={0.3}>
                    <Typography variant="subtitle1" className="crm-section-title">
                      Flujo de recuperacion
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Tendencia consolidada de los ultimos seis ciclos operativos.
                    </Typography>
                  </Stack>
                  <Chip label="6 ciclos" size="small" className="crm-dashboard__chart-chip" />
                </Stack>

                <Box className="crm-dashboard__chart-meta-grid">
                  {chartSummary.map((item) => (
                    <Box key={item.label} className="crm-dashboard__chart-meta-card">
                      <Typography variant="caption" className="crm-dashboard__chart-meta-label">
                        {item.label}
                      </Typography>
                      <Typography variant="body2" className="crm-dashboard__chart-meta-value">
                        {item.value}
                      </Typography>
                      <Typography variant="caption" className="crm-dashboard__chart-meta-note">
                        {item.note}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                <Box className="crm-dashboard__area-chart" aria-hidden="true">
                  <svg viewBox="0 0 560 218" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="crm-trend-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={trendFillStart} />
                        <stop offset="100%" stopColor={trendFillEnd} />
                      </linearGradient>
                    </defs>
                    {[0, 1, 2, 3].map((index) => (
                      <line
                        key={index}
                        x1="16"
                        x2="544"
                        y1={26 + index * 44}
                        y2={26 + index * 44}
                      />
                    ))}
                    <path d={trendChart.areaPath} className="crm-dashboard__area-fill" />
                    <path d={trendChart.linePath} className="crm-dashboard__area-line" />
                    {trendChart.points.map((point, index) => (
                      <circle key={index} cx={point.x} cy={point.y} r="3.2" />
                    ))}
                  </svg>
                </Box>

                <Box className="crm-dashboard__chart-legend">
                  {trendSeries.map((entry) => (
                    <Stack key={entry.label} spacing={0.25}>
                      <Typography variant="caption" color="text.secondary">
                        {entry.label}
                      </Typography>
                      <Typography variant="body2" className="crm-text-medium">
                        ${entry.value.toFixed(2)}M
                      </Typography>
                    </Stack>
                  ))}
                </Box>
              </Stack>
            </Paper>

            <Stack className="crm-dashboard__side-stack">
              <Paper variant="panel" className="crm-dashboard__chart-card crm-dashboard__chart-card--mix">
                <Stack spacing={1.8}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    className="crm-dashboard__panel-header"
                  >
                    <Stack spacing={0.3}>
                      <Typography variant="subtitle1" className="crm-section-title">
                        Distribucion de portafolio
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Mezcla activa por linea de negocio y peso relativo del monto recuperado.
                      </Typography>
                    </Stack>
                    <Chip
                      size="small"
                      className="crm-dashboard__chart-chip"
                      label={`${topPortfolio.label} ${topPortfolio.value}%`}
                    />
                  </Stack>
                  <Stack spacing={1.25} className="crm-dashboard__mix-list">
                    {portfolioMix.map((item) => (
                      <Stack key={item.label} spacing={0.55} className="crm-dashboard__mix-row">
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" className="crm-text-medium">
                            {item.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.amount} · {item.value}%
                          </Typography>
                        </Stack>
                        <Box className="crm-dashboard__mix-track">
                          <Box className="crm-dashboard__mix-fill" sx={{ width: `${item.value}%` }} />
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                </Stack>
              </Paper>

              <Paper variant="panel" className="crm-dashboard__indicator-card">
                <Stack spacing={1.55}>
                  <Stack spacing={0.3} className="crm-dashboard__panel-header">
                    <Typography variant="subtitle1" className="crm-section-title">
                      Indicadores clave
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Objetivos operativos con lectura compacta para seguimiento ejecutivo.
                    </Typography>
                  </Stack>

                  {indicators.map((item) => {
                    const Icon = item.icon;

                    return (
                      <Stack key={item.label} spacing={0.55} className="crm-dashboard__indicator-row">
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" spacing={0.8} alignItems="center">
                            <Box className="crm-dashboard__indicator-icon">
                              <IconRenderer icon={Icon} size="sm" />
                            </Box>
                            <Typography variant="body2" className="crm-text-medium">
                              {item.label}
                            </Typography>
                          </Stack>
                          <Typography
                            variant="caption"
                            className={[
                              'crm-dashboard__indicator-value',
                              `crm-dashboard__indicator-value--${item.tone}`
                            ].join(' ')}
                          >
                            {item.value}
                          </Typography>
                        </Stack>
                        <Box className="crm-dashboard__indicator-track">
                          <Box
                            className={[
                              'crm-dashboard__indicator-fill',
                              `crm-dashboard__indicator-fill--${item.tone}`
                            ].join(' ')}
                            sx={{ width: `${item.progress}%` }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {item.target}
                        </Typography>
                      </Stack>
                    );
                  })}
                </Stack>
              </Paper>
            </Stack>
          </Box>

          <Paper variant="panel" className="crm-dashboard__activity-card crm-dashboard__activity-card--full">
            <Stack spacing={1.4}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                className="crm-dashboard__panel-header"
              >
                <Stack spacing={0.3}>
                  <Typography variant="subtitle1" className="crm-section-title">
                    Actividad reciente
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Eventos operativos y señales de riesgo con prioridad de lectura inmediata.
                  </Typography>
                </Stack>
                <Chip
                  size="small"
                  variant="outlined"
                  className="crm-dashboard__chart-chip"
                  label={`${activityFeed.length} eventos`}
                />
              </Stack>

              <Stack spacing={0.8} className="crm-dashboard__activity-list">
                {activityFeed.map((event, index) => (
                  <Stack key={event.id} spacing={1.15}>
                    <Stack
                      direction="row"
                      spacing={1.1}
                      alignItems="flex-start"
                      className="crm-dashboard__activity-row"
                    >
                      <Box
                        className={[
                          'crm-dashboard__activity-dot',
                          `crm-dashboard__activity-dot--${event.tone}`
                        ].join(' ')}
                      />
                      <Stack spacing={0.25} className="crm-dashboard__activity-copy">
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                          <Typography variant="body2" className="crm-text-medium">
                            {event.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {event.time}
                          </Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {event.detail}
                        </Typography>
                      </Stack>
                    </Stack>
                    {index < activityFeed.length - 1 ? <Divider /> : null}
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </Paper>
        </Stack>
      </PageContent>
    </Page>
  );
}
