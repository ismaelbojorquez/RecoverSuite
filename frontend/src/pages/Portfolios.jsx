import { Add, Delete, Edit, People, PowerSettingsNew, Refresh, Settings } from '@mui/icons-material';
import {
  Alert,
  Button,
  Chip,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Can from '../components/Can.jsx';
import { Page, PageContent, PageHeader } from '../components/layout/Page.jsx';
import usePermissions from '../hooks/usePermissions.js';
import {
  createPortfolio,
  deletePortfolio,
  listPortfolios,
  updatePortfolio
} from '../services/portfolios.js';
import { buildRoutePath } from '../routes/paths.js';
import useNavigation from '../hooks/useNavigation.js';
import BaseTable from '../components/BaseTable.jsx';
import BaseDialog from '../components/BaseDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import useNotify from '../hooks/useNotify.jsx';
import SaldoFieldsManager from '../components/SaldoFieldsManager.jsx';

const dateFormatter = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' });

const buildFormState = (portfolio = {}) => ({
  name: portfolio.name ?? '',
  description: portfolio.description ?? '',
  is_active: portfolio.is_active ?? true
});

const formatDate = (value) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return dateFormatter.format(date);
};

export default function Portfolios() {
  const { hasPermission } = usePermissions();
  const { notify } = useNotify();
  const canRead = hasPermission('portfolios.read');
  const canWrite = hasPermission('portfolios.write');
  const { navigate } = useNavigation();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [hasNext, setHasNext] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('create');
  const [dialogForm, setDialogForm] = useState(buildFormState());
  const [dialogError, setDialogError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState('deactivate');
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [processingAction, setProcessingAction] = useState(false);
  const [saldoManagerOpen, setSaldoManagerOpen] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = useState(null);

  const loadPortfolios = useCallback(
    async (signal) => {
      if (!canRead) {
        return;
      }

      setLoading(true);
      setError('');

      try {
        const data = await listPortfolios({
          limit: rowsPerPage,
          offset: page * rowsPerPage,
          signal
        });
        setRows(data);
        setHasNext(data.length === rowsPerPage);
      } catch (err) {
        if (!signal?.aborted) {
          const message = err.message || 'No fue posible cargar portafolios.';
          setError(message);
          notify(message, { severity: 'error' });
          setRows([]);
          setHasNext(false);
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [canRead, page, rowsPerPage]
  );

  useEffect(() => {
    if (!canRead) {
      return undefined;
    }

    const controller = new AbortController();
    loadPortfolios(controller.signal);

    return () => controller.abort();
  }, [canRead, loadPortfolios]);

  const estimatedCount = useMemo(() => {
    if (hasNext) {
      return (page + 2) * rowsPerPage;
    }
    return page * rowsPerPage + rows.length;
  }, [hasNext, page, rows.length, rowsPerPage]);

  const handleRefresh = () => {
    loadPortfolios();
  };

  const handleOpenClients = (portafolioId) => {
    if (!portafolioId) {
      return;
    }
    navigate(buildRoutePath('clients', {}, { portafolio_id: portafolioId }));
  };

  const handleOpenCreate = () => {
    setDialogMode('create');
    setDialogForm(buildFormState());
    setDialogError('');
    setEditingId(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (portfolio) => {
    setDialogMode('edit');
    setDialogForm(buildFormState(portfolio));
    setDialogError('');
    setEditingId(portfolio.id);
    setDialogOpen(true);
  };

  const handleOpenSaldoFields = (portfolio) => {
    setSelectedPortfolio(portfolio);
    setSaldoManagerOpen(true);
  };

  const handleDialogClose = () => {
    if (saving) {
      return;
    }

    setDialogOpen(false);
    setDialogError('');
    setEditingId(null);
  };

  const handleConfirmClose = () => {
    if (processingAction) {
      return;
    }

    setConfirmOpen(false);
    setConfirmTarget(null);
    setConfirmAction('deactivate');
  };

  const handleFormChange = (field) => (event) => {
    const value =
      field === 'is_active' ? event.target.checked : event.target.value;
    setDialogForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!canWrite) {
      return;
    }

    const name = String(dialogForm.name || '').trim();
    const description = String(dialogForm.description || '').trim();

    if (!name) {
      setDialogError('El nombre es requerido.');
      return;
    }

    setSaving(true);
    setDialogError('');

    try {
      const payload = {
        name,
        description: description.length > 0 ? description : null,
        is_active: Boolean(dialogForm.is_active)
      };

      if (dialogMode === 'create') {
        await createPortfolio(payload);
        if (page !== 0) {
          setPage(0);
        } else {
          await loadPortfolios();
        }
        notify('Portafolio creado con exito', { severity: 'success' });
      } else {
        if (!editingId) {
          throw new Error('Selecciona un portafolio valido.');
        }
        await updatePortfolio(editingId, payload);
        await loadPortfolios();
        notify('Portafolio actualizado', { severity: 'success' });
      }

      setDialogOpen(false);
      setEditingId(null);
    } catch (err) {
      const message = err.message || 'No fue posible guardar el portafolio.';
      setDialogError(message);
      notify(message, { severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleAskAction = (portfolio, action) => {
    setConfirmTarget(portfolio);
    setConfirmAction(action);
    setConfirmOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!confirmTarget?.id) {
      return;
    }

    setProcessingAction(true);

    try {
      if (confirmAction === 'delete') {
        await deletePortfolio(confirmTarget.id);
      } else {
        await updatePortfolio(confirmTarget.id, {
          is_active: confirmAction === 'activate'
        });
      }
      setConfirmOpen(false);
      setConfirmTarget(null);
      setConfirmAction('deactivate');
      notify(
        confirmAction === 'activate'
          ? 'Portafolio activado'
          : confirmAction === 'delete'
            ? 'Portafolio eliminado'
            : 'Portafolio desactivado',
        { severity: 'success' }
      );
      await loadPortfolios();
    } catch (err) {
      const message =
        err.message ||
        (confirmAction === 'activate'
          ? 'No fue posible activar el portafolio.'
          : confirmAction === 'delete'
            ? 'No fue posible eliminar el portafolio.'
            : 'No fue posible desactivar el portafolio.');
      setError(message);
      notify(message, { severity: 'error' });
    } finally {
      setProcessingAction(false);
    }
  };

  if (!canRead) {
    return (
      <Paper variant="page">
        <Stack spacing={1}>
          <Typography variant="h6">Sin permisos</Typography>
          <Typography variant="body2" color="text.secondary">
            No tienes acceso para ver portafolios.
          </Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <Page>
      <PageHeader
        breadcrumbs={[
          { label: 'Inicio', href: buildRoutePath('dashboard') },
          { label: 'Portafolios' }
        ]}
        title="Portafolios"
        subtitle="Gestiona los portafolios de clientes y su estado operativo."
        actions={
          <>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleRefresh}
              disabled={loading}
            >
              Actualizar
            </Button>
            <Can permission="portfolios.write">
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleOpenCreate}
              >
                Nuevo portafolio
              </Button>
            </Can>
          </>
        }
      />

      <PageContent>
        {error && (
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <BaseTable
          columns={[
            { id: 'id', label: 'ID', width: 70 },
            {
              id: 'name',
              label: 'Nombre',
              render: (row) => (
                <Typography variant="body2" className="crm-text-strong">
                  {row.name}
                </Typography>
              )
            },
            {
              id: 'description',
              label: 'Descripcion',
              render: (row) => (
                <Typography variant="body2" color="text.secondary">
                  {row.description || '-'}
                </Typography>
              )
            },
            {
              id: 'is_active',
              label: 'Estado',
              render: (row) => (
                <Chip
                  label={row.is_active ? 'Activo' : 'Inactivo'}
                  color={row.is_active ? 'success' : 'default'}
                  variant="outlined"
                  size="small"
                />
              )
            },
            {
              id: 'created_at',
              label: 'Creado',
              render: (row) => formatDate(row.created_at)
            },
            canWrite
              ? {
                  id: 'actions',
                  label: 'Acciones',
                  align: 'right',
                  render: (row) => (
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Can permission="clients.read">
                        <Tooltip title="Ver clientes">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenClients(row.id)}
                            >
                              <People fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Can>
                      <Tooltip title="Campos de saldo">
                        <IconButton size="small" onClick={() => handleOpenSaldoFields(row)}>
                          <Settings fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => handleOpenEdit(row)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={row.is_active ? 'Desactivar' : 'Activar'}>
                        <span>
                          <IconButton
                            size="small"
                            color={row.is_active ? 'warning' : 'success'}
                            disabled={processingAction}
                            onClick={() =>
                              handleAskAction(
                                row,
                                row.is_active ? 'deactivate' : 'activate'
                              )
                            }
                          >
                            <PowerSettingsNew fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={processingAction}
                            onClick={() => handleAskAction(row, 'delete')}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  )
                }
              : null
          ].filter(Boolean)}
          rows={rows}
          loading={loading}
          skeletonRows={rowsPerPage}
          emptyContent={
            <EmptyState
              title="Sin portafolios"
              description="Crea un portafolio para asignar clientes y creditos."
              action={
                canWrite ? (
                  <Button variant="contained" startIcon={<Add />} onClick={handleOpenCreate}>
                    Nuevo portafolio
                  </Button>
                ) : null
              }
            />
          }
          pagination={{
            count: estimatedCount,
            page,
            rowsPerPage,
            onPageChange: (_, nextPage) => setPage(nextPage),
            onRowsPerPageChange: (event) => {
              setRowsPerPage(Number.parseInt(event.target.value, 10));
              setPage(0);
            },
            rowsPerPageOptions: [10, 20, 50],
            labelDisplayedRows: ({ from, to }) =>
              `${from}-${to} de ${hasNext ? 'muchos' : estimatedCount}`
          }}
        />
      </PageContent>

      <BaseDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        size="sm"
        title={dialogMode === 'create' ? 'Nuevo portafolio' : 'Editar portafolio'}
        actions={
          <>
            <Button onClick={handleDialogClose} disabled={saving}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving || !canWrite}
            >
              {dialogMode === 'create' ? 'Crear' : 'Guardar'}
            </Button>
          </>
        }
      >
        <Stack spacing={2.5} className="crm-dialog-stack">
          {dialogError && <Alert severity="error">{dialogError}</Alert>}
          <TextField
            label="Nombre"
            value={dialogForm.name}
            onChange={handleFormChange('name')}
            required
            fullWidth
          />
          <TextField
            label="Descripcion"
            value={dialogForm.description}
            onChange={handleFormChange('description')}
            fullWidth
            multiline
            minRows={3}
          />
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(dialogForm.is_active)}
                onChange={handleFormChange('is_active')}
              />
            }
            label="Activo"
          />
        </Stack>
      </BaseDialog>

      <SaldoFieldsManager
        open={saldoManagerOpen}
        onClose={() => setSaldoManagerOpen(false)}
        portfolio={selectedPortfolio}
      />

      <BaseDialog
        open={confirmOpen}
        onClose={handleConfirmClose}
        size="sm"
        title={
          confirmAction === 'activate'
            ? 'Activar portafolio'
            : confirmAction === 'delete'
              ? 'Eliminar portafolio'
              : 'Desactivar portafolio'
        }
        actions={
          <>
            <Button onClick={handleConfirmClose} disabled={processingAction}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              color={confirmAction === 'delete' ? 'error' : 'primary'}
              onClick={handleConfirmAction}
              disabled={processingAction}
            >
              {confirmAction === 'activate'
                ? 'Activar'
                : confirmAction === 'delete'
                  ? 'Eliminar'
                  : 'Desactivar'}
            </Button>
          </>
        }
      >
        <Typography variant="body2" color="text.secondary">
          {confirmAction === 'activate'
            ? confirmTarget?.name
              ? `El portafolio "${confirmTarget.name}" quedara activo nuevamente.`
              : 'El portafolio quedara activo nuevamente.'
            : confirmAction === 'delete'
              ? confirmTarget?.name
                ? `El portafolio "${confirmTarget.name}" se eliminara permanentemente.`
                : 'El portafolio se eliminara permanentemente.'
              : confirmTarget?.name
                ? `El portafolio "${confirmTarget.name}" quedara inactivo.`
                : 'El portafolio quedara inactivo.'}
        </Typography>
      </BaseDialog>
    </Page>
  );
}
