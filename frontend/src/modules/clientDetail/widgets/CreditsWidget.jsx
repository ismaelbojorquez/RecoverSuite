import { Paper, Stack, Typography } from '@mui/material';
import { memo } from 'react';
import BaseTable from '../../../components/BaseTable.jsx';
import EmptyState from '../../../components/EmptyState.jsx';

const dateFormatter = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' });
const numberFormatter = new Intl.NumberFormat('es-MX');
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

const formatBalanceValue = (balance, field) => {
  if (!balance || balance.valor === undefined || balance.valor === null) {
    return '-';
  }

  const numeric = Number(balance.valor);
  if (!Number.isNaN(numeric)) {
    const tipoDato = field?.tipo_dato || balance?.campo_saldo?.tipo_dato;
    if (tipoDato === 'currency') {
      return currencyFormatter.format(numeric);
    }

    return numberFormatter.format(numeric);
  }

  return String(balance.valor);
};

const normalizeCredits = (credits) => (Array.isArray(credits) ? credits : []);

const getBalanceMap = (balancesByCredit, creditId) => {
  if (balancesByCredit instanceof Map) {
    return balancesByCredit.get(creditId) || new Map();
  }

  if (balancesByCredit && typeof balancesByCredit === 'object') {
    return balancesByCredit[creditId] || new Map();
  }

  return new Map();
};

function CreditsWidget({
  title = 'Creditos',
  credits = [],
  balanceColumns = [],
  balancesByCredit = new Map(),
  loading = false,
  isReady = true,
  emptyTitle = 'Sin creditos',
  emptyDescription = 'Este cliente no tiene creditos registrados.'
}) {
  const safeCredits = normalizeCredits(credits);
  const safeBalanceColumns = Array.isArray(balanceColumns) ? balanceColumns : [];
  const creditsEmpty = safeCredits.length === 0;

  return (
    <Paper variant="panel-sm">
      <Stack spacing={2}>
        <Typography variant="subtitle1">{title}</Typography>

        {!isReady && loading ? (
          <Typography variant="body2" color="text.secondary">
            Cargando creditos...
          </Typography>
        ) : creditsEmpty ? (
          <EmptyState title={emptyTitle} description={emptyDescription} icon={null} dense />
        ) : (
          <BaseTable
            dense
            columns={[
              {
                id: 'numero_credito',
                label: 'Credito',
                render: (row) => (
                  <Typography variant="body2" className="crm-text-strong">
                    {row.numero_credito || '-'}
                  </Typography>
                )
              },
              {
                id: 'producto',
                label: 'Producto',
                render: (row) => row.producto || '-'
              },
              {
                id: 'created_at',
                label: 'Creado',
                render: (row) => formatDate(row.created_at)
              },
              ...safeBalanceColumns.map((column) => ({
                id: `balance_${column.id}`,
                label: column.label,
                align: 'right',
                render: (row) => {
                  const balance = getBalanceMap(balancesByCredit, row.id)?.get(column.id);

                  return (
                    <Stack spacing={0.25} alignItems="flex-end">
                      <Typography variant="body2">{formatBalanceValue(balance, column)}</Typography>
                      {column.es_principal && (
                        <Typography variant="caption" color="text.secondary">
                          Principal
                        </Typography>
                      )}
                    </Stack>
                  );
                }
              }))
            ]}
            rows={safeCredits}
            loading={loading && !isReady}
          />
        )}
      </Stack>
    </Paper>
  );
}

const MemoizedCreditsWidget = memo(CreditsWidget);
MemoizedCreditsWidget.displayName = 'CreditsWidget';

export default MemoizedCreditsWidget;
