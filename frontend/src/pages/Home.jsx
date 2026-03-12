import {
  Activity,
  ArrowDown,
  ArrowUpRight,
  CircleCheckBig,
  HandCoins,
  ShieldCheck,
  TrendingUp,
  TriangleAlert,
  Wallet
} from 'lucide-react';
import { Box, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import { useMemo } from 'react';
import { Page, PageContent, PageHeader } from '../components/layout/Page.jsx';
import IconRenderer from '../components/ui/IconRenderer.jsx';

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
    detail: 'Equipo Legal aprobó 42 convenios de pago.',
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
  const trendChart = useMemo(
    () => buildAreaChart(trendSeries.map((point) => point.value)),
    []
  );

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: 'Inicio' }]}
        eyebrow="Analitica operativa"
        title="Dashboard ejecutivo de recuperacion"
        subtitle="Monitoreo integral de cobranza, liquidez y riesgo con visuales de alta legibilidad para decisiones rapidas."
      />

      <PageContent>
        <Stack className="crm-dashboard">
          <Paper variant="panel" className="crm-dashboard__hero">
            <Box className="crm-dashboard__hero-grid">
              <Stack spacing={1.2} className="crm-dashboard__hero-copy">
                <Typography variant="overline" className="crm-dashboard__hero-eyebrow">
                  RecoverSuite Intelligence
                </Typography>
                <Typography variant="h5" className="crm-dashboard__hero-title">
                  Pulso en tiempo real de la operacion de cobranza
                </Typography>
                <Typography variant="body2" className="crm-dashboard__hero-copy-text" color="text.secondary">
                  Vista consolidada de rendimiento, riesgos y ejecucion diaria con una experiencia SaaS premium para equipos de analitica y operaciones.
                </Typography>
              </Stack>

              <Stack className="crm-dashboard__hero-kpis">
                <Box className="crm-dashboard__hero-kpi">
                  <Typography variant="caption" color="text.secondary">
                    Eficiencia semanal
                  </Typography>
                  <Typography variant="h4" className="crm-metric-value">
                    94.8%
                  </Typography>
                </Box>
                <Chip
                  label="Actualizacion cada 5 min"
                  size="small"
                  variant="outlined"
                  className="crm-dashboard__hero-chip"
                />
              </Stack>
            </Box>
          </Paper>

          <Box className="crm-dashboard__metrics-grid">
            {metricCards.map((metric) => {
              const Icon = metric.icon;
              const sparkline = buildSparklinePoints(metric.series);

              return (
                <Paper key={metric.title} variant="summary" className="crm-dashboard__metric-card">
                  <Stack spacing={2.1}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
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

                    <Stack spacing={0.35}>
                      <Typography variant="caption" className="crm-metric-label">
                        {metric.title}
                      </Typography>
                      <Typography variant="h4" className="crm-dashboard__metric-value crm-metric-value">
                        {metric.value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
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
            <Paper variant="panel" className="crm-dashboard__chart-card">
              <Stack spacing={1.6}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="subtitle1" className="crm-section-title">
                    Flujo de recuperacion
                  </Typography>
                  <Chip label="6 ciclos" size="small" className="crm-dashboard__chart-chip" />
                </Stack>

                <Box className="crm-dashboard__area-chart" aria-hidden="true">
                  <svg viewBox="0 0 560 218" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="crm-trend-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(99,102,241,0.42)" />
                        <stop offset="100%" stopColor="rgba(99,102,241,0)" />
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

            <Paper variant="panel" className="crm-dashboard__chart-card crm-dashboard__chart-card--mix">
              <Stack spacing={1.8}>
                <Typography variant="subtitle1" className="crm-section-title">
                  Distribucion de portafolio
                </Typography>
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
          </Box>

          <Box className="crm-dashboard__lower-grid">
            <Paper variant="panel" className="crm-dashboard__activity-card">
              <Stack spacing={1.4}>
                <Typography variant="subtitle1" className="crm-section-title">
                  Actividad reciente
                </Typography>
                <Stack spacing={0.8}>
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

            <Paper variant="panel" className="crm-dashboard__indicator-card">
              <Stack spacing={1.55}>
                <Typography variant="subtitle1" className="crm-section-title">
                  Indicadores clave
                </Typography>

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
          </Box>
        </Stack>
      </PageContent>
    </Page>
  );
}
