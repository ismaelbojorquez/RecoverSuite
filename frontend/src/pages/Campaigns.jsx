import {
  AutoAwesome,
  Download,
  InsightsOutlined,
  PlaylistAddCheckCircleOutlined,
  Refresh,
  VisibilityOutlined
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Typography
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import BaseTable from '../components/BaseTable.jsx';
import EmptyState from '../components/EmptyState.jsx';
import FormActions from '../components/form/FormActions.jsx';
import FormField from '../components/form/FormField.jsx';
import FormSection from '../components/form/FormSection.jsx';
import { Page, PageContent, PageHeader } from '../components/layout/Page.jsx';
import useNavigation from '../hooks/useNavigation.js';
import useNotify from '../hooks/useNotify.jsx';
import usePermissions from '../hooks/usePermissions.js';
import { buildRoutePath } from '../routes/paths.js';
import {
  CHANNEL_OPTIONS,
  generateCampaign,
  listCampaigns
} from '../services/campaigns.js';

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const CHANNEL_LABELS = Object.freeze({
  LLAMADA: 'Llamada',
  WHATSAPP: 'WhatsApp',
  SMS: 'SMS',
  EMAIL: 'Email',
  VISITA: 'Visita'
});

const RISK_OPTIONS = Object.freeze([
  { value: '', label: 'Todos los riesgos' },
  { value: 'BAJO', label: 'Bajo' },
  { value: 'MEDIO', label: 'Medio' },
  { value: 'ALTO', label: 'Alto' }
]);

const defaultForm = {
  nombre: '',
  riesgo: '',
  scoreMin: '',
  scoreMax: '',
  canales: CHANNEL_OPTIONS.reduce(
    (accumulator, channel) => ({ ...accumulator, [channel]: true }),
    {}
  )
};

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

const toOptionalNumber = (value) => {
  if (value === '' || value === undefined || value === null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildSelectedChannels = (channelMap = {}) =>
  CHANNEL_OPTIONS.filter((channel) => Boolean(channelMap[channel]));

const sumGroupedClients = (grouped = {}) =>
  Object.values(grouped).reduce(
    (total, records) => total + (Array.isArray(records) ? records.length : 0),
    0
  );

function MetricCard({ icon, label, value, note }) {
  return (
    <Paper variant="panel-sm" sx={{ minHeight: 132 }}>
      <Stack spacing={1.5} sx={{ height: '100%' }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'action.hover',
              color: 'primary.main'
            }}
          >
            {icon}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        </Stack>
        <Typography variant="h4">{value}</Typography>
        <Typography variant="body2" color="text.secondary">
          {note}
        </Typography>
      </Stack>
    </Paper>
  );
}

export default function Campaigns() {
  const { hasAnyPermission } = usePermissions();
  const { navigate } = useNavigation();
  const { notify } = useNotify();
  const canRead = hasAnyPermission([
    'imports.read',
    'gestiones.view_all',
    'gestiones.view_portfolio'
  ]);
  const canGenerate = hasAnyPermission([
    'imports.read',
    'gestiones.create',
    'gestiones.view_all'
  ]);

  const [form, setForm] = useState(defaultForm);
  const [formError, setFormError] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const selectedChannels = useMemo(() => buildSelectedChannels(form.canales), [form.canales]);

  const metrics = useMemo(() => {
    const totalClientes = rows.reduce(
      (accumulator, row) => accumulator + Number(row?.totalClientes || 0),
      0
    );

    return {
      total: rows.length,
      generadas: rows.filter((row) => row?.estado === 'GENERADA').length,
      exportadas: rows.filter((row) => row?.estado === 'EXPORTADA').length,
      clientes: totalClientes
    };
  }, [rows]);

  const loadCampaigns = useCallback(
    async (signal) => {
      if (!canRead) {
        setRows([]);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const data = await listCampaigns({ limit: 50, signal });
        setRows(data);
      } catch (err) {
        if (!signal?.aborted) {
          setRows([]);
          setError(err.message || 'No fue posible cargar las campañas.');
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [canRead]
  );

  useEffect(() => {
    if (!canRead) {
      return undefined;
    }

    const controller = new AbortController();
    loadCampaigns(controller.signal);

    return () => controller.abort();
  }, [canRead, loadCampaigns]);

  const handleRefresh = () => {
    loadCampaigns();
  };

  const handleFieldChange = (field) => (event) => {
    setForm((previous) => ({
      ...previous,
      [field]: event.target.value
    }));
  };

  const handleToggleChannel = (channel) => (event) => {
    setForm((previous) => ({
      ...previous,
      canales: {
        ...previous.canales,
        [channel]: event.target.checked
      }
    }));
  };

  const handleOpenDetail = (campaignId) => {
    if (!campaignId) {
      return;
    }
    navigate(buildRoutePath('campaignDetail', { id: campaignId }));
  };

  const handleGenerate = async () => {
    if (!canGenerate) {
      return;
    }

    const scoreMin = toOptionalNumber(form.scoreMin);
    const scoreMax = toOptionalNumber(form.scoreMax);

    if (selectedChannels.length === 0) {
      setFormError('Selecciona al menos un canal.');
      return;
    }

    if (
      (form.scoreMin !== '' && scoreMin === null) ||
      (form.scoreMax !== '' && scoreMax === null)
    ) {
      setFormError('Los filtros de score deben ser numericos.');
      return;
    }

    if (scoreMin !== null && scoreMax !== null && scoreMin > scoreMax) {
      setFormError('El score minimo no puede ser mayor al score maximo.');
      return;
    }

    setGenerating(true);
    setFormError('');

    try {
      const result = await generateCampaign({
        nombre: form.nombre,
        filtros: {
          riesgo: form.riesgo || undefined,
          scoreMin,
          scoreMax
        },
        canales: selectedChannels
      });

      const nextCampaign = result.campaign;
      if (nextCampaign) {
        setRows((previous) => {
          const deduped = previous.filter((row) => row.id !== nextCampaign.id);
          return [nextCampaign, ...deduped];
        });
      } else {
        await loadCampaigns();
      }

      setForm((previous) => ({
        ...previous,
        nombre: ''
      }));

      notify(
        `Campaña generada con ${nextCampaign?.totalClientes ?? sumGroupedClients(result.grouped)} clientes.`,
        { severity: 'success' }
      );

      if (nextCampaign?.id) {
        handleOpenDetail(nextCampaign.id);
      }
    } catch (err) {
      setFormError(err.message || 'No fue posible generar la campaña.');
    } finally {
      setGenerating(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        id: 'nombre',
        label: 'Nombre',
        render: (row) => (
          <Stack spacing={0.5}>
            <Typography variant="body2" fontWeight={600}>
              {row.nombre || '-'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.canales?.length ? row.canales.map((channel) => CHANNEL_LABELS[channel]).join(' · ') : 'Sin canales'}
            </Typography>
          </Stack>
        )
      },
      {
        id: 'fecha',
        label: 'Fecha',
        render: (row) => formatDate(row.fechaCreacion)
      },
      {
        id: 'totalClientes',
        label: 'Total clientes',
        align: 'right',
        render: (row) => Number(row.totalClientes || 0).toLocaleString('es-MX')
      },
      {
        id: 'estado',
        label: 'Estado',
        render: (row) => (
          <Chip
            size="small"
            label={row.estado || 'SIN ESTADO'}
            color={resolveStatusColor(row.estado)}
            variant="outlined"
          />
        )
      },
      {
        id: 'acciones',
        label: 'Acciones',
        actions: true,
        align: 'right',
        render: (row) => (
          <Button
            size="small"
            variant="text"
            startIcon={<VisibilityOutlined />}
            onClick={() => handleOpenDetail(row.id)}
          >
            Ver detalle
          </Button>
        )
      }
    ],
    [navigate]
  );

  if (!canRead) {
    return (
      <Page>
        <PageHeader
          title="Campañas"
          subtitle="No tienes permisos para consultar campañas masivas."
        />
        <PageContent>
          <EmptyState
            title="Acceso restringido"
            description="Solicita acceso para consultar o generar campañas."
          />
        </PageContent>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Campaign Engine"
        title="Campañas"
        subtitle="Genera lotes omnicanal, segmenta por score y concentra exportaciones operativas por canal."
        breadcrumbs={[
          { label: 'Inicio', href: buildRoutePath('dashboard') },
          { label: 'Campañas' }
        ]}
        actions={
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={loading || generating}
          >
            Actualizar
          </Button>
        }
      />

      <PageContent>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, minmax(0, 1fr))',
              xl: 'repeat(4, minmax(0, 1fr))'
            },
            gap: 2,
            mb: 3
          }}
        >
          <MetricCard
            icon={<InsightsOutlined />}
            label="Campañas activas"
            value={metrics.total}
            note="Últimos lotes generados en el módulo."
          />
          <MetricCard
            icon={<PlaylistAddCheckCircleOutlined />}
            label="Generadas"
            value={metrics.generadas}
            note="Campañas listas para operar y descargar."
          />
          <MetricCard
            icon={<Download />}
            label="Exportadas"
            value={metrics.exportadas}
            note="Lotes con trazabilidad de exportación consolidada."
          />
          <MetricCard
            icon={<AutoAwesome />}
            label="Clientes totales"
            value={metrics.clientes.toLocaleString('es-MX')}
            note="Volumen agregado de registros en campañas listadas."
          />
        </Box>

        <Paper variant="panel" sx={{ mb: 3 }}>
          <Stack spacing={3}>
            <FormSection
              title="Generar campaña"
              subtitle="Aplica filtros de scoring y selecciona los canales a exportar."
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' },
                  gap: 2
                }}
              >
                <FormField
                  label="Nombre campaña"
                  value={form.nombre}
                  onChange={handleFieldChange('nombre')}
                  placeholder="Campaña cobranza preventiva"
                />
                <FormField
                  select
                  label="Riesgo"
                  value={form.riesgo}
                  onChange={handleFieldChange('riesgo')}
                >
                  {RISK_OPTIONS.map((option) => (
                    <MenuItem key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </FormField>
                <FormField
                  label="Score min"
                  type="number"
                  value={form.scoreMin}
                  onChange={handleFieldChange('scoreMin')}
                  inputProps={{ min: 0, max: 100 }}
                />
                <FormField
                  label="Score max"
                  type="number"
                  value={form.scoreMax}
                  onChange={handleFieldChange('scoreMax')}
                  inputProps={{ min: 0, max: 100 }}
                />
              </Box>
            </FormSection>

            <Divider />

            <FormSection
              title="Canales"
              subtitle="Selecciona los canales que el motor puede incluir en la exportación."
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(5, minmax(0, 1fr))' },
                  gap: 1
                }}
              >
                {CHANNEL_OPTIONS.map((channel) => (
                  <FormControlLabel
                    key={channel}
                    control={
                      <Checkbox
                        checked={Boolean(form.canales[channel])}
                        onChange={handleToggleChannel(channel)}
                      />
                    }
                    label={CHANNEL_LABELS[channel]}
                  />
                ))}
              </Box>
            </FormSection>

            {formError ? <Alert severity="error">{formError}</Alert> : null}

            <FormActions>
              <Button
                variant="contained"
                size="large"
                onClick={handleGenerate}
                disabled={!canGenerate || generating}
              >
                {generating ? 'Generando...' : 'GENERAR CAMPAÑA'}
              </Button>
            </FormActions>
          </Stack>
        </Paper>

        {error ? <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert> : null}

        <BaseTable
          columns={columns}
          rows={rows}
          loading={loading}
          getRowId={(row) => row.id}
          emptyContent={
            <EmptyState
              title="Sin campañas registradas"
              description="Genera la primera campaña para ver historial, estado y descargas por canal."
            />
          }
        />
      </PageContent>
    </Page>
  );
}
