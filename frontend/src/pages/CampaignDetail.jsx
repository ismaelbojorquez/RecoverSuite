import {
  ArrowBack,
  Download,
  EmailOutlined,
  PhoneOutlined,
  PlaceOutlined,
  Sms,
  WhatsApp
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import EmptyState from '../components/EmptyState.jsx';
import { Page, PageContent, PageHeader } from '../components/layout/Page.jsx';
import useNavigation from '../hooks/useNavigation.js';
import useNotify from '../hooks/useNotify.jsx';
import usePermissions from '../hooks/usePermissions.js';
import { buildRoutePath, getRouteParams } from '../routes/paths.js';
import {
  CHANNEL_OPTIONS,
  downloadCampaignFile,
  getCampaignById
} from '../services/campaigns.js';

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const CHANNEL_META = Object.freeze({
  LLAMADA: {
    label: 'Llamada',
    icon: <PhoneOutlined />,
    color: 'primary'
  },
  WHATSAPP: {
    label: 'WhatsApp',
    icon: <WhatsApp />,
    color: 'success'
  },
  SMS: {
    label: 'SMS',
    icon: <Sms />,
    color: 'warning'
  },
  EMAIL: {
    label: 'Email',
    icon: <EmailOutlined />,
    color: 'info'
  },
  VISITA: {
    label: 'Visita',
    icon: <PlaceOutlined />,
    color: 'secondary'
  }
});

const CHANNEL_DOWNLOAD_KEYS = Object.freeze({
  LLAMADA: 'llamada',
  WHATSAPP: 'whatsapp',
  SMS: 'sms',
  EMAIL: 'email',
  VISITA: 'visita'
});

const formatDate = (value) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : dateFormatter.format(parsed);
};

const resolveStatusColor = (status) => {
  switch (String(status || '').toUpperCase()) {
    case 'GENERADA':
      return 'info';
    case 'EXPORTADA':
      return 'success';
    default:
      return 'default';
  }
};

const resolveCampaignId = (routeParams) => {
  const candidate = String(routeParams?.id || '').trim();
  if (candidate) {
    return candidate;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  const params = getRouteParams('campaignDetail', window.location.pathname);
  const fallback = String(params?.id || '').trim();
  return fallback || null;
};

function MetricCard({ label, value, note }) {
  return (
    <Paper variant="panel-sm">
      <Stack spacing={1}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5">{value}</Typography>
        <Typography variant="body2" color="text.secondary">
          {note}
        </Typography>
      </Stack>
    </Paper>
  );
}

export default function CampaignDetail({ routeParams }) {
  const { hasAnyPermission } = usePermissions();
  const { navigate } = useNavigation();
  const { notify } = useNotify();
  const canRead = hasAnyPermission([
    'imports.read',
    'gestiones.view_all',
    'gestiones.view_portfolio'
  ]);
  const campaignId = useMemo(() => resolveCampaignId(routeParams), [routeParams]);

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloadingChannel, setDownloadingChannel] = useState('');

  const loadCampaign = useCallback(
    async (signal) => {
      if (!canRead || !campaignId) {
        return;
      }

      setLoading(true);
      setError('');

      try {
        const data = await getCampaignById({ id: campaignId, signal });
        setCampaign(data);
      } catch (err) {
        if (!signal?.aborted) {
          setCampaign(null);
          setError(err.message || 'No fue posible cargar la campaña.');
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [campaignId, canRead]
  );

  useEffect(() => {
    if (!canRead || !campaignId) {
      return undefined;
    }

    const controller = new AbortController();
    loadCampaign(controller.signal);

    return () => controller.abort();
  }, [campaignId, canRead, loadCampaign]);

  const handleBack = () => {
    navigate(buildRoutePath('campaigns'));
  };

  const handleDownload = async (channel) => {
    if (!campaign?.id) {
      return;
    }

    setDownloadingChannel(channel);

    try {
      const { blob, fileName } = await downloadCampaignFile({
        id: campaign.id,
        canal: channel
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      notify(err.message || 'No fue posible descargar el archivo.', {
        severity: 'error'
      });
    } finally {
      setDownloadingChannel('');
    }
  };

  if (!canRead) {
    return (
      <Page>
        <PageHeader
          title="Detalle de campaña"
          subtitle="No tienes permisos para consultar campañas."
        />
        <PageContent>
          <EmptyState
            title="Acceso restringido"
            description="Solicita permisos para revisar campañas y archivos exportados."
          />
        </PageContent>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Campaign Engine"
        title={campaign?.nombre || 'Detalle de campaña'}
        subtitle="Vista ejecutiva de la campaña, filtros aplicados y archivos listos para operación."
        breadcrumbs={[
          { label: 'Inicio', href: buildRoutePath('dashboard') },
          { label: 'Campañas', href: buildRoutePath('campaigns') },
          { label: campaign?.nombre || 'Detalle' }
        ]}
        actions={
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={handleBack}>
            Volver
          </Button>
        }
      />

      <PageContent>
        {!campaignId ? (
          <EmptyState
            title="Campaña no encontrada"
            description="El identificador de campaña no es válido."
          />
        ) : loading ? (
          <Paper variant="panel">
            <Typography variant="body2" color="text.secondary">
              Cargando campaña...
            </Typography>
          </Paper>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : !campaign ? (
          <EmptyState
            title="Sin detalle disponible"
            description="No fue posible recuperar la campaña seleccionada."
          />
        ) : (
          <Stack spacing={3}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' },
                gap: 2
              }}
            >
              <MetricCard
                label="Fecha"
                value={formatDate(campaign.fechaCreacion)}
                note="Momento de generación del lote."
              />
              <MetricCard
                label="Total clientes"
                value={Number(campaign.totalClientes || 0).toLocaleString('es-MX')}
                note="Clientes incluidos en la exportación."
              />
              <MetricCard
                label="Riesgo"
                value={campaign.filtros?.riesgo || 'Todos'}
                note="Filtro de riesgo aplicado."
              />
              <Paper variant="panel-sm">
                <Stack spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    Estado
                  </Typography>
                  <Box>
                    <Chip
                      label={campaign.estado || 'SIN ESTADO'}
                      color={resolveStatusColor(campaign.estado)}
                      variant="outlined"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Seguimiento actual de la campaña.
                  </Typography>
                </Stack>
              </Paper>
            </Box>

            <Paper variant="panel">
              <Stack spacing={2.5}>
                <Typography variant="h6">Información general</Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
                    gap: 2
                  }}
                >
                  <Paper variant="panel-sm">
                    <Stack spacing={1.25}>
                      <Typography variant="subtitle2">Configuración</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Nombre: {campaign.nombre || '-'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Score mínimo: {campaign.filtros?.scoreMin ?? 'Sin límite'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Score máximo: {campaign.filtros?.scoreMax ?? 'Sin límite'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Portafolio: {campaign.filtros?.portafolioId ?? 'Global'}
                      </Typography>
                    </Stack>
                  </Paper>

                  <Paper variant="panel-sm">
                    <Stack spacing={1.25}>
                      <Typography variant="subtitle2">Canales habilitados</Typography>
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        {campaign.canales?.length ? (
                          campaign.canales.map((channel) => (
                            <Chip
                              key={channel}
                              label={CHANNEL_META[channel]?.label || channel}
                              variant="outlined"
                            />
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Sin canales registrados.
                          </Typography>
                        )}
                      </Stack>
                    </Stack>
                  </Paper>
                </Box>
              </Stack>
            </Paper>

            <Stack spacing={2}>
              <Typography variant="h6">Exportaciones por canal</Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: 'repeat(2, minmax(0, 1fr))',
                    xl: 'repeat(3, minmax(0, 1fr))'
                  },
                  gap: 2
                }}
              >
                {CHANNEL_OPTIONS.map((channel) => {
                  const meta = CHANNEL_META[channel];
                  const downloadKey = CHANNEL_DOWNLOAD_KEYS[channel];
                  const available = Boolean(campaign.downloads?.[downloadKey]);

                  return (
                    <Paper key={channel} variant="panel-sm">
                      <Stack spacing={2}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" spacing={1.25} alignItems="center">
                            <Box
                              sx={{
                                width: 42,
                                height: 42,
                                borderRadius: 2,
                                display: 'grid',
                                placeItems: 'center',
                                bgcolor: 'action.hover',
                                color: `${meta.color}.main`
                              }}
                            >
                              {meta.icon}
                            </Box>
                            <Stack spacing={0.25}>
                              <Typography variant="subtitle1">{meta.label}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                Archivo XLSX listo para operación.
                              </Typography>
                            </Stack>
                          </Stack>
                          <Chip
                            size="small"
                            label={available ? 'Disponible' : 'Sin archivo'}
                            color={available ? 'success' : 'default'}
                            variant="outlined"
                          />
                        </Stack>

                        <Button
                          variant={available ? 'contained' : 'outlined'}
                          color={meta.color}
                          startIcon={<Download />}
                          disabled={!available || downloadingChannel === channel}
                          onClick={() => handleDownload(channel)}
                        >
                          {downloadingChannel === channel
                            ? 'Descargando...'
                            : `Descargar ${meta.label}`}
                        </Button>
                      </Stack>
                    </Paper>
                  );
                })}
              </Box>
            </Stack>
          </Stack>
        )}
      </PageContent>
    </Page>
  );
}
