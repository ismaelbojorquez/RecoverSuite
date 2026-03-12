import { Paper, Stack, Typography } from '@mui/material';
import { memo } from 'react';
import BaseTable from '../../../components/BaseTable.jsx';
import EmptyState from '../../../components/EmptyState.jsx';

const dateFormatter = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' });
const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN'
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

const formatAmount = (value) => {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return String(value);
  }

  return currencyFormatter.format(numeric);
};

const normalizePayments = (payments) => (Array.isArray(payments) ? payments : []);

function PaymentsWidget({
  title = 'Pagos',
  payments = [],
  loading = false,
  emptyTitle = 'Sin pagos',
  emptyDescription = 'No hay pagos registrados para este cliente.'
}) {
  const safePayments = normalizePayments(payments);

  return (
    <Paper variant="panel-sm">
      <Stack spacing={2}>
        <Typography variant="subtitle1">{title}</Typography>

        {safePayments.length === 0 ? (
          <EmptyState title={emptyTitle} description={emptyDescription} icon={null} dense />
        ) : (
          <BaseTable
            dense
            columns={[
              {
                id: 'fecha',
                label: 'Fecha',
                render: (row) => formatDate(row.fecha || row.created_at)
              },
              {
                id: 'monto',
                label: 'Monto',
                align: 'right',
                render: (row) => formatAmount(row.monto)
              },
              {
                id: 'estado',
                label: 'Estado',
                render: (row) => row.estado || '-'
              },
              {
                id: 'referencia',
                label: 'Referencia',
                render: (row) => row.referencia || row.referencia_externa || '-'
              }
            ]}
            rows={safePayments}
            loading={loading}
          />
        )}
      </Stack>
    </Paper>
  );
}

const MemoizedPaymentsWidget = memo(PaymentsWidget);
MemoizedPaymentsWidget.displayName = 'PaymentsWidget';

export default MemoizedPaymentsWidget;
