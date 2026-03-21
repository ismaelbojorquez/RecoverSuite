import {
  Add,
  DeleteOutline,
  Edit,
  Refresh
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Typography
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import BaseDialog from '../components/BaseDialog.jsx';
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
  createDictamen,
  deleteDictamen,
  listDictamenes,
  updateDictamen
} from '../services/dictamenes.js';
import { listPortfolios } from '../services/portfolios.js';

const defaultForm = {
  nombre: '',
  descripcion: '',
  tipoContacto: 'NO_CONTACTADO',
  score: '50',
  llamada: '',
  whatsapp: '',
  sms: '',
  email: '',
  visita: '',
  riesgo: 'MEDIO',
  permiteContacto: true,
  recomendarReintento: true,
  bloquearCliente: false,
  activo: true
};

const parseInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const resolvePortafolioIdFromPath = (pathname) => {
  const rawPath = String(pathname || '');
  const search = rawPath.includes('?') ? rawPath.split('?')[1] : '';
  const params = new URLSearchParams(search);
  return parseInteger(params.get('portafolio_id'));
};

const normalizeNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatScore = (value) => {
  const parsed = normalizeNumber(value);
  return parsed === null ? '-' : parsed.toFixed(0);
};

const resolveRiskColor = (value) => {
  switch (String(value || '').toUpperCase()) {
    case 'BAJO':
      return 'success';
    case 'MEDIO':
      return 'warning';
    case 'ALTO':
      return 'error';
    default:
      return 'default';
  }
};

const buildDictamenPayload = (form, portafolioId) => ({
  portafolioId,
  nombre: String(form.nombre || '').trim(),
  descripcion: String(form.descripcion || '').trim() || null,
  tipoContacto: String(form.tipoContacto || '').trim().toUpperCase(),
  score: normalizeNumber(form.score),
  riesgo: String(form.riesgo || '').trim().toUpperCase(),
  canales: {
    llamada: normalizeNumber(form.llamada),
    whatsapp: normalizeNumber(form.whatsapp),
    sms: normalizeNumber(form.sms),
    email: normalizeNumber(form.email),
    visita: normalizeNumber(form.visita)
  },
  permiteContacto: Boolean(form.permiteContacto),
  recomendarReintento: Boolean(form.recomendarReintento),
  bloquearCliente: Boolean(form.bloquearCliente),
  activo: Boolean(form.activo)
});

const buildFormFromRow = (row) => ({
  nombre: row?.nombre || '',
  descripcion: row?.descripcion || '',
  tipoContacto: row?.tipoContacto || 'NO_CONTACTADO',
  score: row?.score === null || row?.score === undefined ? '50' : String(row.score),
  llamada:
    row?.canales?.llamada === null || row?.canales?.llamada === undefined
      ? ''
      : String(row.canales.llamada),
  whatsapp:
    row?.canales?.whatsapp === null || row?.canales?.whatsapp === undefined
      ? ''
      : String(row.canales.whatsapp),
  sms:
    row?.canales?.sms === null || row?.canales?.sms === undefined
      ? ''
      : String(row.canales.sms),
  email:
    row?.canales?.email === null || row?.canales?.email === undefined
      ? ''
      : String(row.canales.email),
  visita:
    row?.canales?.visita === null || row?.canales?.visita === undefined
      ? ''
      : String(row.canales.visita),
  riesgo: row?.riesgo || 'MEDIO',
  permiteContacto: Boolean(row?.permiteContacto),
  recomendarReintento: Boolean(row?.recomendarReintento),
  bloquearCliente: Boolean(row?.bloquearCliente),
  activo: Boolean(row?.activo)
});

export default function Dictamenes() {
  const { hasPermission } = usePermissions();
  const { pathname, navigate } = useNavigation();
  const { notify } = useNotify();
  const canRead = hasPermission('dictamenes.read');
  const canWrite = hasPermission('dictamenes.write');
  const canReadPortfolios = hasPermission('portfolios.read');
  const portafolioId = useMemo(() => resolvePortafolioIdFromPath(pathname), [pathname]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [portfolios, setPortfolios] = useState([]);
  const [loadingPortfolios, setLoadingPortfolios] = useState(false);
  const [portfolioError, setPortfolioError] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('create');
  const [dialogForm, setDialogForm] = useState(defaultForm);
  const [dialogError, setDialogError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dictamenToDelete, setDictamenToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadDictamenes = useCallback(
    async (signal) => {
      if (!canRead || !portafolioId) {
        setRows([]);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const data = await listDictamenes({
          portafolioId,
          activo: includeInactive ? undefined : true,
          signal
        });
        setRows(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!signal?.aborted) {
          setError(err.message || 'No fue posible cargar los dictámenes.');
          setRows([]);
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [canRead, includeInactive, portafolioId]
  );

  useEffect(() => {
    if (!canRead) {
      return undefined;
    }

    const controller = new AbortController();
    loadDictamenes(controller.signal);
    return () => controller.abort();
  }, [canRead, loadDictamenes]);

  useEffect(() => {
    if (!canRead || !canReadPortfolios) {
      setPortfolios([]);
      return undefined;
    }

    const controller = new AbortController();

    const loadPortfolios = async () => {
      setLoadingPortfolios(true);
      setPortfolioError('');

      try {
        const data = await listPortfolios({
          limit: 250,
          offset: 0,
          signal: controller.signal
        });
        setPortfolios(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!controller.signal.aborted) {
          setPortfolios([]);
          setPortfolioError(err.message || 'No fue posible cargar los portafolios.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingPortfolios(false);
        }
      }
    };

    loadPortfolios();

    return () => controller.abort();
  }, [canRead, canReadPortfolios]);

  const portfolioOptions = useMemo(() => {
    const normalizedRows = Array.isArray(portfolios) ? portfolios : [];
    const sortedRows = [...normalizedRows].sort((left, right) =>
      String(left?.name || '').localeCompare(String(right?.name || ''), 'es', {
        sensitivity: 'base'
      })
    );

    if (
      portafolioId &&
      !sortedRows.some((portfolio) => Number(portfolio?.id) === Number(portafolioId))
    ) {
      return [
        {
          id: portafolioId,
          name: `Portafolio #${portafolioId}`,
          is_active: true
        },
        ...sortedRows
      ];
    }

    return sortedRows;
  }, [portafolioId, portfolios]);

  const selectedPortfolio = useMemo(
    () =>
      portfolioOptions.find((portfolio) => Number(portfolio?.id) === Number(portafolioId)) || null,
    [portafolioId, portfolioOptions]
  );

  const openCreateDialog = () => {
    setDialogMode('create');
    setDialogForm(defaultForm);
    setEditingId(null);
    setDialogError('');
    setDialogOpen(true);
  };

  const openEditDialog = (row) => {
    setDialogMode('edit');
    setEditingId(row.id);
    setDialogForm(buildFormFromRow(row));
    setDialogError('');
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) {
      return;
    }

    setDialogOpen(false);
    setDialogError('');
    setEditingId(null);
  };

  const openDeleteDialog = (row) => {
    setDictamenToDelete(row);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    if (deleting) {
      return;
    }

    setDeleteDialogOpen(false);
    setDictamenToDelete(null);
  };

  const reloadPageData = async () => {
    await loadDictamenes();
  };

  const handlePortfolioChange = (event) => {
    const nextPortafolioId = parseInteger(event.target.value);
    navigate(
      buildRoutePath('dictamenes', {}, { portafolio_id: nextPortafolioId || undefined })
    );
  };

  const handleSave = async () => {
    if (!portafolioId) {
      setDialogError('Selecciona un portafolio antes de administrar dictámenes.');
      return;
    }

    const payload = buildDictamenPayload(dialogForm, portafolioId);

    if (!payload.nombre) {
      setDialogError('El nombre del dictamen es obligatorio.');
      return;
    }

    if (!payload.tipoContacto) {
      setDialogError('El tipo de contacto es obligatorio.');
      return;
    }

    if (payload.score === null) {
      setDialogError('El score general es obligatorio.');
      return;
    }

    setSaving(true);
    setDialogError('');

    try {
      if (dialogMode === 'create') {
        await createDictamen(payload);
        notify('Dictamen creado', { severity: 'success' });
      } else {
        await updateDictamen(editingId, payload);
        notify('Dictamen actualizado', { severity: 'success' });
      }

      setDialogOpen(false);
      await reloadPageData();
    } catch (err) {
      setDialogError(err.message || 'No fue posible guardar el dictamen.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!dictamenToDelete?.id) {
      return;
    }

    setDeleting(true);

    try {
      await deleteDictamen(dictamenToDelete.id);
      notify('Dictamen eliminado', { severity: 'success' });
      closeDeleteDialog();
      await reloadPageData();
    } catch (err) {
      notify(err.message || 'No fue posible eliminar el dictamen.', {
        severity: 'error'
      });
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        id: 'nombre',
        label: 'Nombre',
        minWidth: 220,
        render: (row) => (
          <Stack spacing={0.35}>
            <Typography variant="body2" className="crm-text-strong">
              {row.nombre}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.descripcion || 'Sin descripción operativa'}
            </Typography>
          </Stack>
        )
      },
      {
        id: 'score',
        label: 'Score',
        minWidth: 90,
        align: 'right',
        render: (row) => formatScore(row.score)
      },
      {
        id: 'riesgo',
        label: 'Riesgo',
        minWidth: 110,
        render: (row) => (
          <Chip
            size="small"
            color={resolveRiskColor(row.riesgo)}
            label={row.riesgo || '-'}
          />
        )
      },
      {
        id: 'tipoContacto',
        label: 'Tipo',
        minWidth: 130,
        render: (row) => (
          <Chip size="small" variant="outlined" label={row.tipoContacto || 'NO_CONTACTADO'} />
        )
      },
      {
        id: 'llamada',
        label: 'Llamada',
        minWidth: 90,
        align: 'right',
        render: (row) => formatScore(row.canales?.llamada)
      },
      {
        id: 'whatsapp',
        label: 'WhatsApp',
        minWidth: 105,
        align: 'right',
        render: (row) => formatScore(row.canales?.whatsapp)
      },
      {
        id: 'sms',
        label: 'SMS',
        minWidth: 80,
        align: 'right',
        render: (row) => formatScore(row.canales?.sms)
      },
      {
        id: 'email',
        label: 'Email',
        minWidth: 80,
        align: 'right',
        render: (row) => formatScore(row.canales?.email)
      },
      {
        id: 'visita',
        label: 'Visita',
        minWidth: 80,
        align: 'right',
        render: (row) => formatScore(row.canales?.visita)
      },
      {
        id: 'activo',
        label: 'Activo',
        minWidth: 90,
        render: (row) => (
          <Chip
            size="small"
            color={row.activo ? 'success' : 'default'}
            variant={row.activo ? 'filled' : 'outlined'}
            label={row.activo ? 'Sí' : 'No'}
          />
        )
      },
      {
        id: 'acciones',
        label: 'Acciones',
        minWidth: 120,
        actions: true,
        render: (row) => (
          <Stack direction="row" spacing={0.5}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Edit />}
              onClick={() => openEditDialog(row)}
              disabled={!canWrite}
            >
              Editar
            </Button>
            <Button
              size="small"
              color="error"
              variant="outlined"
              startIcon={<DeleteOutline />}
              onClick={() => openDeleteDialog(row)}
              disabled={!canWrite}
            >
              Eliminar
            </Button>
          </Stack>
        )
      }
    ],
    [canWrite]
  );

  if (!canRead) {
    return (
      <Page>
        <PageHeader
          breadcrumbs={[
            { label: 'Inicio', href: buildRoutePath('dashboard') },
            { label: 'Dictamenes' }
          ]}
          title="Dictámenes"
          subtitle="Administración central de scoring y clasificación operativa."
        />
        <PageContent>
          <EmptyState
            eyebrow="Acceso"
            title="Sin permisos para ver dictámenes"
            description="Tu perfil actual no puede abrir este módulo."
            icon={null}
          />
        </PageContent>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        breadcrumbs={[
          { label: 'Inicio', href: buildRoutePath('dashboard') },
          { label: 'Configuracion' },
          { label: 'Dictamenes' }
        ]}
        title="Dictámenes"
        subtitle={
          selectedPortfolio?.name
            ? `Catálogo operativo del portafolio ${selectedPortfolio.name}.`
            : 'Tablero operativo para administrar scores, riesgo y disponibilidad por canal.'
        }
        actions={
          canWrite ? (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={openCreateDialog}
              disabled={!portafolioId}
            >
              Crear dictamen
            </Button>
          ) : null
        }
      />

      <PageContent>
        <Stack spacing={2}>
          {!portafolioId ? (
            <Alert severity="warning">
              Selecciona un portafolio para administrar su catálogo de dictámenes.
            </Alert>
          ) : null}

          {portfolioError ? (
            <Alert severity="error" onClose={() => setPortfolioError('')}>
              {portfolioError}
            </Alert>
          ) : null}

          <Paper variant="panel-sm">
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              alignItems={{ md: 'center' }}
              spacing={1.5}
              useFlexGap
            >
              <Stack spacing={0.35}>
                <Typography variant="subtitle1" className="crm-surface-card__title">
                  Catálogo operativo
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Selecciona el portafolio para administrar su catálogo de dictámenes y consulta la base usada por el motor de decisiones.
                </Typography>
              </Stack>

              <Box sx={{ flexGrow: 1 }} />

              <Stack
                direction={{ xs: 'column', lg: 'row' }}
                spacing={1}
                alignItems={{ lg: 'center' }}
                useFlexGap
              >
                <Box sx={{ minWidth: { xs: '100%', sm: 300 } }}>
                  <FormField
                    select
                    size="small"
                    label="Portafolio / catálogo"
                    value={portafolioId ? String(portafolioId) : ''}
                    onChange={handlePortfolioChange}
                    helperText={
                      canReadPortfolios
                        ? 'Selecciona el catálogo que deseas administrar.'
                        : 'Abre esta vista desde un portafolio activo para cambiar el catálogo.'
                    }
                    disabled={!canReadPortfolios || loadingPortfolios}
                  >
                    <MenuItem value="">
                      <em>Selecciona un portafolio</em>
                    </MenuItem>
                    {portfolioOptions.map((portfolio) => (
                      <MenuItem key={portfolio.id} value={String(portfolio.id)}>
                        {portfolio.name || `Portafolio #${portfolio.id}`}
                        {portfolio.is_active === false ? ' (inactivo)' : ''}
                      </MenuItem>
                    ))}
                  </FormField>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Incluir inactivos
                </Typography>
                <Switch
                  checked={includeInactive}
                  onChange={(event) => setIncludeInactive(event.target.checked)}
                />
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => reloadPageData()}
                  disabled={loading}
                >
                  Recargar
                </Button>
              </Stack>
            </Stack>
          </Paper>

          {error ? (
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          ) : null}

          <BaseTable
            dense
            columns={columns}
            rows={rows}
            loading={loading}
            emptyContent={
              <EmptyState
                title="Sin dictámenes"
                description={
                  portafolioId
                    ? 'Todavía no hay dictámenes registrados. Crea el primero para iniciar el catálogo.'
                    : 'Selecciona un portafolio para cargar y administrar su catálogo.'
                }
                icon={null}
                dense
              />
            }
          />
        </Stack>
      </PageContent>

      <BaseDialog
        open={dialogOpen}
        onClose={closeDialog}
        title={dialogMode === 'create' ? 'Crear dictamen' : 'Editar dictamen'}
        subtitle="Configura score general, canales, riesgo y banderas operativas."
        actions={
          <FormActions sx={{ width: '100%' }}>
            <Button variant="ghost" onClick={closeDialog} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={saving}>
              {dialogMode === 'create' ? 'Crear' : 'Guardar'}
            </Button>
          </FormActions>
        }
      >
        <Stack spacing={2}>
          {dialogError ? <Alert severity="error">{dialogError}</Alert> : null}

          <FormSection
            title="Identidad"
            subtitle="Define el nombre visible, el tipo de resultado y una descripción breve de uso."
          >
            <Box className="crm-form__grid">
              <FormField
                label="Nombre"
                value={dialogForm.nombre}
                onChange={(event) =>
                  setDialogForm((prev) => ({ ...prev, nombre: event.target.value }))
                }
                required
              />
              <FormField
                label="Descripción"
                value={dialogForm.descripcion}
                onChange={(event) =>
                  setDialogForm((prev) => ({ ...prev, descripcion: event.target.value }))
                }
              />
              <FormField
                select
                label="Tipo de contacto"
                value={dialogForm.tipoContacto}
                onChange={(event) =>
                  setDialogForm((prev) => ({ ...prev, tipoContacto: event.target.value }))
                }
                required
              >
                <MenuItem value="CONTACTADO">CONTACTADO</MenuItem>
                <MenuItem value="NO_CONTACTADO">NO_CONTACTADO</MenuItem>
                <MenuItem value="INVALIDO">INVALIDO</MenuItem>
                <MenuItem value="RECHAZO">RECHAZO</MenuItem>
              </FormField>
            </Box>
          </FormSection>

          <FormSection
            title="Scoring"
            subtitle="El score general resume el dictamen y los canales permiten afinación específica."
          >
            <Box className="crm-form__grid">
              <FormField
                label="Score general"
                type="number"
                value={dialogForm.score}
                onChange={(event) =>
                  setDialogForm((prev) => ({ ...prev, score: event.target.value }))
                }
                required
                inputProps={{ min: 0, max: 100, step: '0.01' }}
              />
              <FormField
                select
                label="Riesgo"
                value={dialogForm.riesgo}
                onChange={(event) =>
                  setDialogForm((prev) => ({ ...prev, riesgo: event.target.value }))
                }
                required
              >
                <MenuItem value="BAJO">BAJO</MenuItem>
                <MenuItem value="MEDIO">MEDIO</MenuItem>
                <MenuItem value="ALTO">ALTO</MenuItem>
              </FormField>
              <FormField
                label="Llamada"
                type="number"
                value={dialogForm.llamada}
                onChange={(event) =>
                  setDialogForm((prev) => ({ ...prev, llamada: event.target.value }))
                }
                inputProps={{ min: 0, max: 100, step: '0.01' }}
              />
              <FormField
                label="WhatsApp"
                type="number"
                value={dialogForm.whatsapp}
                onChange={(event) =>
                  setDialogForm((prev) => ({ ...prev, whatsapp: event.target.value }))
                }
                inputProps={{ min: 0, max: 100, step: '0.01' }}
              />
              <FormField
                label="SMS"
                type="number"
                value={dialogForm.sms}
                onChange={(event) =>
                  setDialogForm((prev) => ({ ...prev, sms: event.target.value }))
                }
                inputProps={{ min: 0, max: 100, step: '0.01' }}
              />
              <FormField
                label="Email"
                type="number"
                value={dialogForm.email}
                onChange={(event) =>
                  setDialogForm((prev) => ({ ...prev, email: event.target.value }))
                }
                inputProps={{ min: 0, max: 100, step: '0.01' }}
              />
              <FormField
                label="Visita"
                type="number"
                value={dialogForm.visita}
                onChange={(event) =>
                  setDialogForm((prev) => ({ ...prev, visita: event.target.value }))
                }
                inputProps={{ min: 0, max: 100, step: '0.01' }}
              />
            </Box>
          </FormSection>

          <FormSection
            title="Banderas"
            subtitle="Ajusta el comportamiento operativo asociado al dictamen."
          >
            <Stack spacing={1}>
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(dialogForm.permiteContacto)}
                    onChange={(event) =>
                      setDialogForm((prev) => ({
                        ...prev,
                        permiteContacto: event.target.checked
                      }))
                    }
                  />
                }
                label="Permite contacto"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(dialogForm.recomendarReintento)}
                    onChange={(event) =>
                      setDialogForm((prev) => ({
                        ...prev,
                        recomendarReintento: event.target.checked
                      }))
                    }
                  />
                }
                label="Recomendar reintento"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(dialogForm.bloquearCliente)}
                    onChange={(event) =>
                      setDialogForm((prev) => ({
                        ...prev,
                        bloquearCliente: event.target.checked
                      }))
                    }
                  />
                }
                label="Bloquear cliente"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(dialogForm.activo)}
                    onChange={(event) =>
                      setDialogForm((prev) => ({ ...prev, activo: event.target.checked }))
                    }
                  />
                }
                label="Activo"
              />
            </Stack>
          </FormSection>
        </Stack>
      </BaseDialog>

      <BaseDialog
        open={deleteDialogOpen}
        onClose={closeDeleteDialog}
        size="sm"
        title="Eliminar dictamen"
        subtitle="Esta acción eliminará el registro del catálogo."
        actions={
          <FormActions sx={{ width: '100%' }}>
            <Button variant="ghost" onClick={closeDeleteDialog} disabled={deleting}>
              Cancelar
            </Button>
            <Button color="error" variant="contained" onClick={handleDelete} disabled={deleting}>
              Eliminar
            </Button>
          </FormActions>
        }
      >
        <Stack spacing={2}>
          <Typography variant="body2">
            {`Vas a eliminar el dictamen "${dictamenToDelete?.nombre || ''}".`}
          </Typography>
          <Divider />
          <Typography variant="body2" color="text.secondary">
            Esta operación no se puede deshacer.
          </Typography>
        </Stack>
      </BaseDialog>
    </Page>
  );
}
