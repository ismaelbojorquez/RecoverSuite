import { ArrowRight, Pencil, RefreshCcw } from 'lucide-react';
import {
  Alert,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Can from '../components/Can.jsx';
import usePermissions from '../hooks/usePermissions.js';
import { listClients, createClient, updateClient } from '../services/clients.js';
import { buildRoutePath } from '../routes/paths.js';
import useNavigation from '../hooks/useNavigation.js';
import { Page, PageContent, PageHeader } from '../components/layout/Page.jsx';
import BaseTable from '../components/BaseTable.jsx';
import EmptyState from '../components/EmptyState.jsx';
import BaseDialog from '../components/BaseDialog.jsx';
import FormActions from '../components/form/FormActions.jsx';
import FormField from '../components/form/FormField.jsx';
import FormSection from '../components/form/FormSection.jsx';
import IconRenderer from '../components/ui/IconRenderer.jsx';
import useNotify from '../hooks/useNotify.jsx';
import { getPortfolioById } from '../services/portfolios.js';
import TableToolbar from '../components/TableToolbar.jsx';

const DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 2;
const dateFormatter = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' });

const parseInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const resolvePortafolioId = () => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = parseInteger(params.get('portafolio_id'));
    if (fromQuery && fromQuery > 0) {
      return fromQuery;
    }
  }

  return null;
};

const buildFullName = (client) =>
  [client.nombre, client.apellido_paterno, client.apellido_materno]
    .filter(Boolean)
    .join(' ');

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

export default function Clients() {
  const { hasPermission } = usePermissions();
  const { notify } = useNotify();
  const canRead = hasPermission('clients.read');
  const canWrite = hasPermission('clients.write');
  const { navigate } = useNavigation();
  const [portafolioId] = useState(resolvePortafolioId);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [portfolioName, setPortfolioName] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [hasNext, setHasNext] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('create');
  const [dialogError, setDialogError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    numero_cliente: '',
    nombre_completo: '',
    rfc: '',
    curp: ''
  });

  const [filter, setFilter] = useState('');
  const [debouncedFilter, setDebouncedFilter] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedFilter(filter.trim());
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [filter]);

  useEffect(() => {
    setPage(0);
  }, [debouncedFilter]);

  useEffect(() => {
    if (!portafolioId) {
      navigate(buildRoutePath('portfolios'));
    }
  }, [navigate, portafolioId]);

  const loadClients = useCallback(
    async (signal) => {
      if (!canRead) {
        return;
      }

      if (!portafolioId) {
        setRows([]);
        setHasNext(false);
        setLoading(false);
        setError('');
        return;
      }

      setLoading(true);
      setError('');

      try {
        const query =
          debouncedFilter.length >= MIN_QUERY_LENGTH ? debouncedFilter : '';

        const data = await listClients({
          portafolioId,
          limit: rowsPerPage,
          offset: page * rowsPerPage,
          query,
          signal
        });

        setRows(data);
        setHasNext(data.length === rowsPerPage);
      } catch (err) {
        if (!signal?.aborted) {
          setError(err.message || 'No fue posible cargar clientes.');
          setRows([]);
          setHasNext(false);
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [canRead, debouncedFilter, page, portafolioId, rowsPerPage]
  );

  useEffect(() => {
    if (!canRead) {
      return undefined;
    }

    const controller = new AbortController();

    const resolvePortfolio = async () => {
      if (!portafolioId) {
        setPortfolioName('');
        return;
      }

      try {
        const portfolio = await getPortfolioById({ id: portafolioId, signal: controller.signal });
        if (!portfolio) {
          navigate(buildRoutePath('portfolios'));
          return;
        }
        setPortfolioName(portfolio?.name || '');
        await loadClients(controller.signal);
      } catch (err) {
        if (!controller.signal.aborted) {
          navigate(buildRoutePath('portfolios'));
        }
      }
    };

    resolvePortfolio();

    return () => controller.abort();
  }, [canRead, loadClients, navigate, portafolioId]);

  const estimatedCount = useMemo(() => {
    if (hasNext) {
      return (page + 2) * rowsPerPage;
    }
    return page * rowsPerPage + rows.length;
  }, [hasNext, page, rows.length, rowsPerPage]);

  const handleRefresh = () => {
    loadClients();
  };

  const handleOpenCreate = () => {
    if (!portafolioId) {
      notify('Selecciona un portafolio antes de crear un cliente.', { severity: 'warning' });
      return;
    }

    setDialogMode('create');
    setEditingId(null);
    resetForm();
    setDialogError('');
    setDialogOpen(true);
  };
  const handleOpenEdit = (client) => {
    if (!portafolioId) {
      notify('Selecciona un portafolio antes de editar un cliente.', { severity: 'warning' });
      return;
    }

    setDialogMode('edit');
    setEditingId(client.id);
    setForm({
      numero_cliente: client.numero_cliente || '',
      nombre_completo: buildFullName(client),
      rfc: client.rfc || '',
      curp: client.curp || ''
    });
    setDialogError('');
    setDialogOpen(true);
  };

  const resetForm = () =>
    setForm({
      numero_cliente: '',
      nombre_completo: '',
      rfc: '',
      curp: ''
    });

  const handleSave = async () => {
    setDialogError('');
    const numero_cliente = form.numero_cliente.trim();
    const nombre_completo = form.nombre_completo.trim();

    if (!numero_cliente || !nombre_completo) {
      setDialogError('Numero de cliente y nombre del cliente son obligatorios.');
      return;
    }

    if (!portafolioId) {
      setDialogError('Selecciona un portafolio antes de crear un cliente.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        portafolioId,
        numero_cliente,
        nombre_completo,
        rfc: form.rfc.trim() || undefined,
        curp: form.curp.trim() || undefined
      };

      if (dialogMode === 'edit' && editingId) {
        await updateClient({ id: editingId, ...payload });
        notify('Cliente actualizado', { severity: 'success' });
      } else {
        await createClient(payload);
        notify('Cliente creado', { severity: 'success' });
      }
      setDialogOpen(false);
      setEditingId(null);
      resetForm();
      loadClients();
    } catch (err) {
      setDialogError(err.message || 'No fue posible guardar el cliente.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDetail = (clientId) => {
    const target = buildRoutePath('clientDetail', { id: clientId });
    navigate(target);
  };

  const helperText =
    filter.trim().length > 0 && filter.trim().length < MIN_QUERY_LENGTH
      ? `Ingresa al menos ${MIN_QUERY_LENGTH} caracteres para filtrar.`
      : 'Filtra por nombre completo o numero de cliente.';

  const renderCreateDialog = () => (
    <BaseDialog
      open={dialogOpen}
      onClose={() => {
        setDialogOpen(false);
        setEditingId(null);
        setDialogMode('create');
        setDialogError('');
        resetForm();
      }}
      title={dialogMode === 'edit' ? 'Editar cliente' : 'Nuevo cliente'}
      size="sm"
      actions={
        <FormActions spacing={1}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {dialogMode === 'edit' ? 'Guardar' : 'Crear'}
          </Button>
        </FormActions>
      }
    >
      <Stack className="crm-form">
        {dialogError && (
          <Alert severity="error" onClose={() => setDialogError('')}>
            {dialogError}
          </Alert>
        )}
        <FormSection
          title="Identidad del cliente"
          subtitle="Captura los datos base para crear o actualizar el registro."
        >
          <Stack className="crm-form__stack">
            <FormField
              label="Numero de cliente"
              value={form.numero_cliente}
              onChange={(e) => setForm((prev) => ({ ...prev, numero_cliente: e.target.value }))}
              required
            />
            <FormField
              label="Nombre del cliente"
              value={form.nombre_completo}
              onChange={(e) => setForm((prev) => ({ ...prev, nombre_completo: e.target.value }))}
              required
            />
          </Stack>
        </FormSection>
        <FormSection
          title="Identificadores"
          subtitle="Completa solo los campos que apliquen para conciliacion y trazabilidad."
        >
          <Stack className="crm-form__stack">
            <FormField
              label="RFC (opcional)"
              value={form.rfc}
              onChange={(e) => setForm((prev) => ({ ...prev, rfc: e.target.value }))}
            />
            <FormField
              label="CURP (opcional)"
              value={form.curp}
              onChange={(e) => setForm((prev) => ({ ...prev, curp: e.target.value }))}
            />
          </Stack>
        </FormSection>
      </Stack>
    </BaseDialog>
  );

  if (!canRead) {
    return (
      <Paper variant="page">
        <Stack spacing={1}>
          <Typography variant="h6">Sin permisos</Typography>
          <Typography variant="body2" color="text.secondary">
            No tienes acceso para ver clientes.
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
          { label: 'Clientes' }
        ]}
        title="Clientes"
        subtitle={portafolioId ? '' : 'Selecciona un portafolio para continuar'}
        actions={
          <>
            <Chip
              label={
                portafolioId
                  ? portfolioName || `Portafolio #${portafolioId}`
                  : 'Portafolio no seleccionado'
              }
              variant="outlined"
            />
            <Button
              variant="outlined"
              startIcon={<IconRenderer icon={RefreshCcw} size="sm" />}
              onClick={handleRefresh}
              disabled={loading}
            >
              Actualizar
            </Button>
            <Can permission="clients.write">
              <Button
                variant="contained"
                onClick={handleOpenCreate}
                disabled={!portafolioId}
              >
                Nuevo cliente
              </Button>
            </Can>
          </>
        }
      />

      <PageContent>
        {!portafolioId && (
          <Alert severity="info" variant="outlined" className="crm-alert--spaced">
            Selecciona un portafolio desde la lista para ver sus clientes.
          </Alert>
        )}
        {error && (
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <BaseTable
          toolbar={
            <TableToolbar
              eyebrow="Exploración"
              title="Listado de clientes"
              subtitle="Busca rápidamente por nombre o número de cliente y mantén el contexto del portafolio activo."
              searchValue={filter}
              onSearchChange={setFilter}
              onSearchClear={() => setFilter('')}
              searchPlaceholder="Buscar por nombre o numero de cliente"
              searchHelperText={helperText}
              filters={
                <>
                  <Chip
                    variant="outlined"
                    label={
                      portafolioId
                        ? portfolioName || `Portafolio #${portafolioId}`
                        : 'Portafolio no seleccionado'
                    }
                  />
                  <Chip
                    variant="outlined"
                    label={`${rows.length} registro${rows.length === 1 ? '' : 's'} visibles`}
                  />
                </>
              }
            />
          }
          columns={[
            {
              id: 'numero_cliente',
              label: 'No. cliente',
              render: (row) => row.numero_cliente || row.id
            },
            {
              id: 'nombre',
              label: 'Nombre',
              render: (row) => (
                <Typography variant="body2" className="crm-text-strong">
                  {buildFullName(row)}
                </Typography>
              )
            },
            { id: 'rfc', label: 'RFC', render: (row) => row.rfc || '-' },
            { id: 'curp', label: 'CURP', render: (row) => row.curp || '-' },
            { id: 'created_at', label: 'Creado', render: (row) => formatDate(row.created_at) },
            {
              id: 'acciones',
              label: 'Acciones',
              align: 'right',
              render: (row) => (
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  {canWrite ? (
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => handleOpenEdit(row)}>
                        <IconRenderer icon={Pencil} size="sm" />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                  <Tooltip title="Ver detalle">
                    <IconButton size="small" onClick={() => handleOpenDetail(row.id)}>
                      <IconRenderer icon={ArrowRight} size="sm" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              )
            }
          ]}
          rows={rows}
          loading={loading}
          emptyContent={
            !portafolioId ? (
              <EmptyState
                title="Selecciona un portafolio"
                description="Haz clic sobre un portafolio para ver a sus clientes."
              />
            ) : (
              <EmptyState
                title="Sin clientes"
                description="Ajusta el filtro o verifica el portafolio seleccionado."
              />
            )
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
      {canWrite ? renderCreateDialog() : null}
    </Page>
  );
}
