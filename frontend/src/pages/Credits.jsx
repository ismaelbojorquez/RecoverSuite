import { RefreshCcw } from 'lucide-react';
import {
  Alert,
  Button,
  Chip,
  Paper,
  Stack,
  Typography
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Page, PageContent, PageHeader } from '../components/layout/Page.jsx';
import BaseTable from '../components/BaseTable.jsx';
import EmptyState from '../components/EmptyState.jsx';
import TableToolbar from '../components/TableToolbar.jsx';
import IconRenderer from '../components/ui/IconRenderer.jsx';
import usePermissions from '../hooks/usePermissions.js';
import useNotify from '../hooks/useNotify.jsx';
import { buildRoutePath } from '../routes/paths.js';
import { listCredits } from '../services/credits.js';
import { listSaldoFields } from '../services/saldoFields.js';
import { evaluateCalculatedFields } from '../utils/calculatedFields.js';

const dateFormatter = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' });
const currencyFormatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const numberFormatter = new Intl.NumberFormat('es-MX');

const resolvePortafolioId = () => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const id = Number.parseInt(params.get('portafolio_id'), 10);
    if (Number.isInteger(id) && id > 0) return id;
  }
  return null;
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : dateFormatter.format(date);
};

const formatValueByType = (fieldType, raw) => {
  if (raw === null || raw === undefined) return '-';
  switch (fieldType) {
    case 'currency': {
      const num = Number(raw);
      return Number.isFinite(num) ? currencyFormatter.format(num) : String(raw);
    }
    case 'number': {
      const num = Number(raw);
      return Number.isFinite(num) ? numberFormatter.format(num) : String(raw);
    }
    case 'date':
      return formatDate(raw);
    case 'datetime': {
      const d = new Date(raw);
      return Number.isNaN(d.getTime()) ? '-' : `${formatDate(d)} ${d.toLocaleTimeString('es-MX')}`;
    }
    case 'time':
      return String(raw);
    case 'boolean':
      return raw === true || raw === 'true' || raw === '1' ? 'Sí' : 'No';
    case 'text':
    default:
      return String(raw);
  }
};

const extractDynamicValues = (row, fields) => {
  const map = {};
  const entries = Array.isArray(row.saldos)
    ? row.saldos
    : Array.isArray(row.credit_saldos)
      ? row.credit_saldos
      : [];

  entries.forEach((entry) => {
    const fieldId = entry.saldo_field_id || entry.field_id || entry.fieldId;
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;
    const fieldType = (field.field_type || '').toLowerCase();
    const value =
      entry.value_number ??
      entry.value_datetime ??
      entry.value_date ??
      entry.value_time ??
      entry.value_text ??
      null;
    map[field.key] = value;
  });

  // fallback: if API returns map por key
  if (row.saldo_values && typeof row.saldo_values === 'object') {
    Object.entries(row.saldo_values).forEach(([k, v]) => {
      map[k] = v;
    });
  }

  return map;
};

export default function Credits() {
  const { hasPermission } = usePermissions();
  const { notify } = useNotify();
  const canRead = hasPermission('credits.read');
  const portafolioId = resolvePortafolioId();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [hasNext, setHasNext] = useState(false);
  const [filter, setFilter] = useState('');
  const [fields, setFields] = useState([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);

  const estimatedCount = useMemo(() => {
    if (hasNext) return (page + 2) * rowsPerPage;
    return page * rowsPerPage + rows.length;
  }, [hasNext, page, rows.length, rowsPerPage]);

  const loadFields = useCallback(
    async (signal) => {
      if (!portafolioId) return;
      setFieldsLoading(true);
      try {
        const data = await listSaldoFields({ portfolioId: portafolioId, signal });
        const ordered = [...data].sort(
          (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0) || a.id - b.id
        );
        setFields(ordered);
      } catch (err) {
        if (!signal?.aborted) {
          notify(err.message || 'No fue posible cargar campos de saldo.', { severity: 'error' });
        }
      } finally {
        if (!signal?.aborted) setFieldsLoading(false);
      }
    },
    [notify, portafolioId]
  );

  const loadCredits = useCallback(
    async (signal) => {
      if (!canRead || !portafolioId) return;
      setLoading(true);
      setError('');
      try {
        const data = await listCredits({
          portafolioId,
          limit: rowsPerPage,
          offset: page * rowsPerPage,
          query: filter.trim(),
          signal
        });
        setRows(data);
        setHasNext(data.length === rowsPerPage);
      } catch (err) {
        if (!signal?.aborted) {
          const message = err.message || 'No fue posible cargar creditos.';
          setError(message);
          notify(message, { severity: 'error' });
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [canRead, filter, notify, page, portafolioId, rowsPerPage]
  );

  useEffect(() => {
    if (!canRead || !portafolioId) return undefined;
    const controller = new AbortController();
    loadFields(controller.signal);
    return () => controller.abort();
  }, [canRead, loadFields, portafolioId]);

  useEffect(() => {
    if (!canRead || !portafolioId) return undefined;
    const controller = new AbortController();
    loadCredits(controller.signal);
    return () => controller.abort();
  }, [canRead, loadCredits, portafolioId]);

  useEffect(() => {
    setPage(0);
  }, [filter]);

  const derivedRows = useMemo(() => {
    if (!fields.length) return rows;
    return rows.map((row) => {
      const dynamicValues = extractDynamicValues(row, fields);
      const { values: calcValues, errors } = evaluateCalculatedFields(fields, dynamicValues);
      const merged = { ...dynamicValues, ...calcValues };
      return { ...row, _saldoValues: merged, _saldoErrors: errors };
    });
  }, [fields, rows]);

  const saldoColumns = useMemo(
    () =>
      fields.map((field) => ({
        id: `saldo_${field.key}`,
        label: field.label || field.key,
        render: (row) => {
          const val = row._saldoValues ? row._saldoValues[field.key] : undefined;
          const formatted = formatValueByType(field.field_type?.toLowerCase(), val);
          const error = row._saldoErrors && row._saldoErrors[field.key];
          return error ? (
            <Tooltip title={error}>
              <Typography color="error" variant="body2">
                {formatted}
              </Typography>
            </Tooltip>
          ) : (
            formatted
          );
        }
      })),
    [fields]
  );

  const baseColumns = useMemo(
    () => [
      {
        id: 'numero_credito',
        label: 'Número de crédito',
        render: (row) => row.numero_credito || row.numero || '-'
      },
      { id: 'producto', label: 'Producto', render: (row) => row.producto || '-' }
    ],
    []
  );

  const columns = useMemo(() => [...baseColumns, ...saldoColumns], [baseColumns, saldoColumns]);

  const handleRefresh = () => loadCredits();

  if (!canRead) {
    return (
      <Page>
        <PageHeader
          breadcrumbs={[
            { label: 'Inicio', href: buildRoutePath('dashboard') },
            { label: 'Créditos' }
          ]}
          title="Créditos"
          subtitle="Vista operativa de créditos y saldos asociados."
        />
        <PageContent>
          <EmptyState
            eyebrow="Acceso"
            title="Sin permisos para ver créditos"
            description="Tu perfil no tiene acceso a este módulo financiero."
            icon={null}
          />
        </PageContent>
      </Page>
    );
  }

  if (!portafolioId) {
    return (
      <Page>
        <PageHeader
          breadcrumbs={[
            { label: 'Inicio', href: buildRoutePath('dashboard') },
            { label: 'Créditos' }
          ]}
          title="Créditos"
          subtitle="Selecciona un portafolio para abrir el detalle financiero."
        />
        <PageContent>
          <EmptyState
            eyebrow="Contexto requerido"
            title="Selecciona un portafolio"
            description="Abre esta vista con ?portafolio_id=<id> para cargar créditos y campos de saldo del portafolio activo."
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
          { label: 'Créditos' }
        ]}
        title="Créditos"
        subtitle={`Portafolio ${portafolioId}`}
        actions={
          <Button
            variant="outlined"
            startIcon={<IconRenderer icon={RefreshCcw} size="sm" />}
            onClick={handleRefresh}
            disabled={loading || fieldsLoading}
          >
            Actualizar
          </Button>
        }
      />

      <PageContent>
        {error && (
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <BaseTable
          toolbar={
            <TableToolbar
              eyebrow="Consulta"
              title="Listado de créditos"
              subtitle="Escanea rápidamente créditos y campos de saldo del portafolio activo."
              searchValue={filter}
              onSearchChange={setFilter}
              onSearchClear={() => setFilter('')}
              searchPlaceholder="Buscar por numero de credito o cliente"
              searchHelperText="La búsqueda respeta la consulta actual y no altera el fetching."
              filters={
                <>
                  <Chip variant="outlined" label={`Portafolio #${portafolioId}`} />
                  <Chip
                    variant="outlined"
                    label={`${fields.length} campo${fields.length === 1 ? '' : 's'} de saldo`}
                  />
                </>
              }
            />
          }
          columns={columns}
          rows={derivedRows}
          loading={loading || fieldsLoading}
          emptyContent={
            <EmptyState
              title="Sin créditos"
              description="No hay créditos para este portafolio."
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
    </Page>
  );
}
